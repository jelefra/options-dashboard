import dayjs from 'dayjs';
import Papa from 'papaparse';

import { INPUT_DATE_FORMAT } from '../constants';
import accounts from '../data/accounts';
import { reversedTickersMap } from '../data/tickers';
import { TradeData, TradeIBKR } from '../types';

export const parseSymbol = (symbol: string) => symbol.match(/^(\w+) (\w+) ([\d.]+) (\w)$/);

const convertArrayToObject = (data: ParsedFile) => {
  const [headers, ...rows] = data;
  const csv = Papa.unparse({ fields: headers, data: rows });
  const result = Papa.parse(csv, { header: true, dynamicTyping: true, skipEmptyLines: true });
  return result.data;
};

const validateRow = (row: string[], nextRow: string[]) => {
  const relevantAssetCategory = 'Equity and Index Options';
  return (
    row[0] === 'Trades' &&
    (row[3].includes(relevantAssetCategory) || nextRow[3].includes(relevantAssetCategory)) &&
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

    const tradesUnparsed = file.filter((row: string[], index: number) => {
      return validateRow(row, file[index + 1]);
    });

    return {
      accountId,
      trades: convertArrayToObject(tradesUnparsed) as TradeIBKR[],
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

export const processFile = (
  { accountId, trades }: { accountId: string; trades: TradeIBKR[] },
  loggedTrades: TradeData[]
) => {
  const unmatchedTrades = [];
  const matchedTrades = [];

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
          Math.abs(trade.commission - unitCommission) < 0.5
        );
      });

      if (tradeIndex === -1) {
        unmatchedTrades.push({
          ...trade,
          Quantity: trade.Quantity > 0 ? 1 : -1,
          'Comm/Fee': unitCommission,
          account,
        });
      } else {
        // Prepare data for a new CSV
        // Store the exact commission (still per unit) and exact trade date with time
        matchedTrades.push({
          ...loggedTrades[tradeIndex],
          commission: unitCommission,
          fullDate: trade['Date/Time'],
        });
        // Mutate the array to eventually confirm that no unexpected trades have been recorded
        loggedTrades.splice(tradeIndex, 1);
      }
    }
  }
  return { unmatchedTrades, matchedTrades };
};
