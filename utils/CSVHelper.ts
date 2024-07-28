import dayjs from 'dayjs';
import Papa from 'papaparse';

import { INPUT_DATE_FORMAT } from '../constants';
import accounts from '../data/accounts';
import { reversedTickersMap } from '../data/tickers';
import {
  BankActivityTypes,
  BankData,
  BankIBKR,
  ForexData,
  ForexIBKR,
  TradeData,
  TradeIBKR,
} from '../types';

export const parseSymbol = (symbol: string) => symbol.match(/^(\w+) (\w+) ([\d.]+) (\w)$/);

const convertArrayToObject = (data: ParsedFile) => {
  const [headers, ...rows] = data;
  const csv = Papa.unparse({ fields: headers, data: rows });
  const result = Papa.parse(csv, { header: true, dynamicTyping: true, skipEmptyLines: true });
  return result.data;
};

const validateBankRow = (row: any[]): boolean => {
  return (
    row[0] === 'Deposits & Withdrawals' &&
    !!row[2] && // Currency
    !!row[3] && // Settle Date
    !!row[4] && // Description
    !!row[5] // Amount
  );
};

const validateForexRow = (row: any[], nextRow: any[]): boolean => {
  const assetCategory = 'Forex';
  return (
    row[0] === 'Trades' &&
    (row[3].includes(assetCategory) || nextRow[3].includes(assetCategory)) &&
    !!row[4] && // Currency
    !!row[5] && // Symbol
    !!row[6] && // Date/Time
    !!row[7] && // Quantity
    row[8] !== '0' // T. Price
    // Comm in GBP (may be 0)
  );
};

const validateTradeRow = (row: any[], nextRow: any[]): boolean => {
  const assetCategory = 'Equity and Index Options';
  return (
    row[0] === 'Trades' &&
    (row[3].includes(assetCategory) || nextRow[3].includes(assetCategory)) &&
    !!row[5] && // Symbol
    !!row[6] && // Date/Time
    !!row[7] && // Quantity
    !!row[8] && // T. Price
    !!row[11] // Comm/Fee
  );
};

export type ParsedFile = string[][];
export const prepareFiles = (files: ParsedFile[]) => {
  return files.map((file) => {
    const accountId = file.find(
      (row) => row[0] === 'Account Information' && row[1] === 'Data' && row[2] === 'Account'
    )?.[3];
    if (!accountId) throw 'Account id not found';

    const tradesUnparsed = file.filter((row: any[], index: number) => {
      return validateTradeRow(row, file[index + 1]);
    });

    const forexUnparsed = file.filter((row: any[], index: number) => {
      return validateForexRow(row, file[index + 1]);
    });

    const bankUnparsed = file.filter((row: any[]) => {
      return validateBankRow(row);
    });

    return {
      accountId,
      trades: convertArrayToObject(tradesUnparsed) as TradeIBKR[],
      forex: convertArrayToObject(forexUnparsed) as ForexIBKR[],
      bank: convertArrayToObject(bankUnparsed) as BankIBKR[],
    };
  });
};

const formatDateString = (input: string) => {
  const day = input.slice(0, 2);
  const month = input.slice(2, 5);
  const year = input.slice(5);

  const formattedMonth = month.charAt(0).toUpperCase() + month.slice(1).toLowerCase();

  return day + formattedMonth + year;
};

const formatQuantity = (n: number) => Number(String(n).replace(',', ''));

const within = (numA: number, numB: number, buffer: number) => Math.abs(numA - numB) < buffer;

export const processFile = (
  {
    accountId,
    trades,
    forex,
    bank,
  }: { accountId: string; trades: TradeIBKR[]; forex: ForexIBKR[]; bank: BankIBKR[] },
  loggedTrades: TradeData[],
  loggedForex: ForexData[],
  loggedBank: BankData[]
) => {
  const tradesNotMatched = [];
  const allEnrichedTradeData = [];
  for (let trade of trades) {
    const account = Object.values(accounts).find((account) => account.id === accountId)?.name;
    if (!account) throw 'Account name not found';

    const tradeDate = dayjs(trade['Date/Time']);
    const [, ticker, expiryStr, strikeStr, typeCode] = parseSymbol(trade.Symbol) || [];

    const type = { P: 'Put', C: 'Call' }[typeCode];
    if (!type) console.error('Type not identified');

    const expiry = dayjs(formatDateString(expiryStr), 'DDMMMYY', 'en', true);
    const strike = Number(strikeStr);
    const tradePrice = trade['T. Price'];
    const quantity = trade.Quantity;
    const unitCommission = trade['Comm/Fee'] / Math.abs(quantity);

    for (let i = 0; i < Math.abs(quantity); i++) {
      const tradeIndex = loggedTrades.findIndex((trade) => {
        return (
          trade.date === tradeDate.format(INPUT_DATE_FORMAT) &&
          trade.account === account &&
          trade.type === type &&
          trade.ticker === (reversedTickersMap[ticker] ?? ticker) &&
          trade.expiry === expiry.format(INPUT_DATE_FORMAT) &&
          trade.strike === strike &&
          trade.tradePrice === tradePrice &&
          within(trade.commission, unitCommission, 0.5)
        );
      });

      if (tradeIndex === -1) {
        tradesNotMatched.push({
          ...trade,
          Quantity: trade.Quantity > 0 ? 1 : -1,
          'Comm/Fee': unitCommission,
          account,
        });
      } else {
        // Prepare data for a new CSV
        // Store the exact commission (still per unit) and exact trade date with time
        allEnrichedTradeData.push({
          ...loggedTrades[tradeIndex],
          commission: unitCommission,
          dateTime: trade['Date/Time'],
        });
        // Mutate the array to eventually confirm that no unexpected trades have been recorded
        loggedTrades.splice(tradeIndex, 1);
      }
    }
  }

  const allEnrichedForexData = [];
  const forexNotMatched = [];
  for (let forexOperation of forex) {
    const account = Object.values(accounts).find((account) => account.id === accountId)?.name;
    if (!account) throw 'Account name not found';

    const dateTime = forexOperation['Date/Time'];
    const quantity = forexOperation.Quantity;
    const rate = forexOperation['T. Price'];
    const currencyPair = forexOperation.Symbol;
    const commission = forexOperation['Comm in GBP'];

    const forexIndex = loggedForex.findIndex((loggedForexOperation) => {
      return (
        loggedForexOperation.date === dayjs(dateTime).format(INPUT_DATE_FORMAT) &&
        loggedForexOperation.account === account &&
        within(loggedForexOperation.quantity, formatQuantity(quantity), 0.05) &&
        within(loggedForexOperation.rate, rate, 0.01) &&
        within(loggedForexOperation.commission, commission, 0.05) &&
        loggedForexOperation.currencyPair === currencyPair
      );
    });

    const enrichedForexData = {
      date: dayjs(dateTime).format(INPUT_DATE_FORMAT),
      dateTime,
      account,
      quantity: formatQuantity(forexOperation.Quantity),
      rate,
      commission,
      currencyPair,
    };

    allEnrichedForexData.push(enrichedForexData);

    if (forexIndex === -1) {
      forexNotMatched.push({ ...forexOperation, account });
    } else {
      loggedForex.splice(forexIndex, 1);
    }
  }

  const mapDescriptionToType = (description: string): BankActivityTypes => {
    if (description.includes('Electronic Fund Transfer')) return 'Deposit';
    if (description.includes('Disbursement')) return 'Withdrawal';
    throw new Error('Bank type not identified:');
  };

  const allBankData = [];
  const bankNotMatched = [];
  for (let bankOperation of bank) {
    const account = Object.values(accounts).find((account) => account.id === accountId)?.name;
    if (!account) throw 'Account name not found';

    const date = bankOperation['Settle Date'];
    const amount = bankOperation.Amount;
    const description = bankOperation.Description;
    const type = mapDescriptionToType(description);
    const currency = bankOperation.Currency;

    const bankIndex = loggedBank.findIndex((loggedBankOperation) => {
      return (
        loggedBankOperation.date === dayjs(date).format(INPUT_DATE_FORMAT) &&
        loggedBankOperation.account === account &&
        loggedBankOperation.type === type &&
        loggedBankOperation.amount === amount &&
        loggedBankOperation.currency === currency
      );
    });

    allBankData.push({
      date: dayjs(bankOperation['Settle Date']).format(INPUT_DATE_FORMAT),
      account,
      type,
      amount,
      currency,
    });

    if (bankIndex === -1) {
      bankNotMatched.push({ ...bankOperation, account });
    } else {
      loggedBank.splice(bankIndex, 1);
    }
  }

  return {
    trades: { notMatched: tradesNotMatched, complete: allEnrichedTradeData },
    forex: { notMatched: forexNotMatched, complete: allEnrichedForexData },
    bank: { notMatched: bankNotMatched, complete: allBankData },
  };
};
