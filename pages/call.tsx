import cx from 'classnames';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
dayjs.extend(isSameOrAfter);
import customParseFormat from 'dayjs/plugin/customParseFormat';
dayjs.extend(customParseFormat);

import {
  calcAssignmentPct,
  calcCashEquivalent,
  calcDteCurrent,
  calcDteTotal,
  calcNetReturn,
  calcPriceIncrease,
  calcReturn,
  calcReturnPctForPeriod,
  calcStockPriceHigh,
  convertToGBP,
  getCallStatus,
} from '../utils';
import { dateShortTerm, decimalTwo, pctOne, thousands } from '../utils/format';

import { Batch, CallRow, TradeData, TransactionData } from '../types';

import { INPUT_DATE_FORMAT, DISPLAY } from '../constants';

// @ts-ignore
import tradesData from '../data/options.csv';
// @ts-ignore
import transactionsData from '../data/transactions.csv';
import tickers from '../data/tickers';
import accounts from '../data/accounts';

import styles from '../styles/Table.module.css';
import { useEffect, useState } from 'react';

const NOW = dayjs();

const Call = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [rates, setRates] = useState<{ [key: string]: number }>(null);
  const [currentTickerPrices, setCurrentTickerPrices] = useState<{ [key: string]: number }>(null);

  useEffect(() => {
    setIsLoading(true);
    const fetchForexRates = async () => {
      const response = await fetch('/api/forexRates');
      const data = await response.json();
      setRates(data.rates);
    };
    fetchForexRates().catch(console.error);

    const fetchCallTickerPrices = async () => {
      const response = await fetch(`/api/callTickerPrices?now=${String(NOW)}`);
      const data = await response.json();
      setCurrentTickerPrices(data.currentTickerPrices);
    };
    fetchCallTickerPrices().catch(console.error);
    setIsLoading(false);
  }, []);

  if (isLoading) return <p>Loading...</p>;
  if (!rates || !currentTickerPrices) return <p>Data missing.</p>;

  const trades: TradeData[] = tradesData;
  const transactions: TransactionData[] = transactionsData;

  const headings: { name: keyof CallRow; format?: Function; align?: string }[] = [
    { name: 'account' },
    { name: 'batchCode' },
    { name: 'acquisitionCost', format: decimalTwo, align: 'right' },
    { name: 'netCost', format: decimalTwo, align: 'right' },
    { name: 'costBasisDrop', format: pctOne, align: 'right' },
    { name: 'returnPct', format: pctOne, align: 'right' },
    { name: 'returnGBP', format: thousands, align: 'right' },
    { name: 'date', format: dateShortTerm },
    { name: 'expiry', format: dateShortTerm },
    { name: 'dteTotal', align: 'right' },
    { name: 'dteCurrent', align: 'right' },
    { name: 'tradePrice', format: decimalTwo, align: 'right' },
    { name: 'stockPrice', format: decimalTwo, align: 'right' },
    { name: 'current', format: decimalTwo, align: 'right' },
    { name: 'strike', format: decimalTwo, align: 'right' },
    { name: 'status' },
    { name: 'assignmentPct', format: pctOne, align: 'right' },
    { name: 'high', format: decimalTwo, align: 'right' },
    { name: 'highPct', format: pctOne, align: 'right' },
    { name: 'priceIncreaseGBP', format: thousands, align: 'right' },
    { name: 'return30DPctLastCall', format: pctOne, align: 'right' },
    { name: 'returnGBPLastCall', format: thousands, align: 'right' },
    { name: 'cashEquivalentGBP', format: thousands, align: 'right' },
    { name: 'daysTotal', align: 'right' },
    { name: 'returnGBPIfAssigned', format: thousands, align: 'right' },
    { name: 'returnPctIfAssigned', format: pctOne, align: 'right' },
    { name: 'return30DPctIfAssigned', format: pctOne, align: 'right' },
    { name: 'return1YPctIfAssigned', format: pctOne, align: 'right' },
  ];

  const batches: { [key: string]: Batch } = {};

  for (let transaction of transactions) {
    const { account, batchCodes: batchCodesStr, ticker, type } = transaction;

    if (type === 'Purchase' && batchCodesStr) {
      const batchCodes = batchCodesStr.includes(',') ? batchCodesStr.split(',') : [batchCodesStr];

      for (let batchCode of batchCodes) {
        const { commission, quantity, stockPrice } = transaction;
        batches[batchCode] = batches[batchCode] || {
          account,
          // TODO
          //  Acquisition date set to the first purchase date
          //  May underestimate gains and losses
          //  Is it worth improving?
          acquisitionDate: dayjs(transaction.date, INPUT_DATE_FORMAT),
          acquisitionCost: 0,
          batchCode,
          netCumulativePremium: 0,
          origin: 'Purchase',
          quantity: 0,
          ticker,
        };

        const batch = batches[batchCode];
        const batchQuantity = quantity / batchCodes.length;
        const oldAcquisitionCost = batch.acquisitionCost;
        const oldQuantity = batch.quantity;
        batch.acquisitionCost =
          (oldAcquisitionCost * oldQuantity + stockPrice * batchQuantity) /
          (oldQuantity + batchQuantity);
        batch.netCumulativePremium -= commission / batchQuantity;
        batch.quantity += batchQuantity;
      }
    }

    // TODO
    // if (type === 'Sale' && batchCodes) {
    //   ...
    // }
  }

  for (let trade of trades) {
    const {
      account,
      batchCode,
      closePrice,
      commission,
      date,
      expiry,
      stockPrice,
      strike,
      ticker,
      tradePrice,
      type,
    } = trade;

    const { optionSize } = tickers[ticker];

    if (type === 'Put' && closePrice && closePrice < strike) {
      batches[batchCode] = {
        account,
        batchCode,
        acquisitionCost: strike,
        netCumulativePremium: tradePrice - commission / optionSize,
        origin: 'Put',
        acquisitionDate: dayjs(date, INPUT_DATE_FORMAT),
        quantity: optionSize,
        ticker,
      };
    }

    if (type === 'Call') {
      const batch = batches[batchCode];
      batch.netCumulativePremium += tradePrice - commission / optionSize;

      if (closePrice && closePrice > strike) {
        batch.exitValue = strike;
      }

      const expiryDate = dayjs(expiry, INPUT_DATE_FORMAT);
      if (expiryDate.isSameOrAfter(NOW, 'day')) {
        batch.currentCall = {
          account,
          batchCode,
          commission,
          date: dayjs(date, INPUT_DATE_FORMAT),
          expiry: expiryDate,
          stockPrice,
          strike,
          ticker: batch.ticker,
          tradePrice,
          type: 'Call',
        };
      }
    }
  }

  const orderedBatches = Object.entries(batches)
    .sort(([a], [b]) => a.localeCompare(b))
    .sort(([, a], [, b]) => a.account.localeCompare(b.account))
    .sort(([, a], [, b]) => {
      if (a.currentCall?.account && b.currentCall?.account) {
        return 0;
      } else if (a.currentCall?.account) {
        return -1;
      } else {
        return 1;
      }
    });

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          {headings.map(({ name }, index) => (
            <th
              className={cx(styles.th, styles.freezeFirstThRow, styles.white, {
                [styles.freezeFirstThCell]: index === 0,
                [styles.freezeSecondThCell]: index === 1,
              })}
              key={index}
            >
              {DISPLAY[name] || name}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {orderedBatches
          // @ts-ignore
          .filter(([, { exitValue }]) => !exitValue)
          .map(([, batchData], rowIndex) => {
            const orderedRowValues = headings.map((heading) => ({
              ...heading,
            }));

            const {
              account,
              acquisitionDate,
              currentCall,
              acquisitionCost,
              netCumulativePremium,
              ticker,
            } = batchData;
            const { commission, date, expiry, stockPrice, strike, tradePrice } = currentCall || {};
            const { colour, currency, optionSize } = tickers[ticker];
            const forexRate = rates[currency];
            const current = currentTickerPrices[ticker];

            const daysTotal = expiry?.diff(acquisitionDate, 'day');
            const high = calcStockPriceHigh(strike, tradePrice, commission, optionSize);
            const returnPctLastCall =
              (tradePrice * optionSize - commission) / (stockPrice * optionSize);
            const dteLastCall = expiry?.diff(date, 'day');
            const netCost = acquisitionCost - netCumulativePremium;
            const returnPctIfAssigned = strike / netCost - 1;

            const cashEquivalent = calcCashEquivalent(optionSize, stockPrice);
            const priceIncrease = calcPriceIncrease(current, high, optionSize);
            const returnCurrent = calcReturn(current, netCost, optionSize);
            const returnIfAssigned = calcReturn(strike, netCost, optionSize);
            const returnLastCall = calcNetReturn(optionSize, tradePrice, commission);

            const row: CallRow = {
              account,
              acquisitionCost,
              assignmentPct: calcAssignmentPct(strike, current),
              batchCode: batchData.batchCode,
              cashEquivalentGBP: convertToGBP(cashEquivalent, forexRate),
              costBasisDrop: netCost / acquisitionCost - 1,
              current,
              date,
              daysTotal,
              dteCurrent: calcDteCurrent(expiry, NOW),
              dteTotal: calcDteTotal(expiry, date),
              expiry,
              high,
              highPct: high / current - 1,
              netCost,
              priceIncreaseGBP: convertToGBP(priceIncrease, forexRate),
              return1YPctIfAssigned: calcReturnPctForPeriod(returnPctIfAssigned, daysTotal, 365),
              return30DPctIfAssigned: calcReturnPctForPeriod(returnPctIfAssigned, daysTotal, 30),
              return30DPctLastCall: calcReturnPctForPeriod(returnPctLastCall, dteLastCall, 30),
              returnGBP: convertToGBP(
                Math.min(returnCurrent, returnIfAssigned || Infinity),
                forexRate
              ),
              returnGBPIfAssigned: convertToGBP(returnIfAssigned, forexRate),
              returnGBPLastCall: convertToGBP(returnLastCall, forexRate),
              returnPct: Math.min(current, strike || Infinity) / netCost - 1,
              returnPctIfAssigned,
              status: getCallStatus(strike, current),
              stockPrice,
              strike,
              tradePrice,
            };

            const accountColour = accounts[account].colour;

            return (
              <tr key={rowIndex}>
                {orderedRowValues.map(({ name, format = (v) => v, align }, index) => {
                  const showContrast = name !== 'account' && name !== 'batchCode';
                  const showZeroValues =
                    name === 'assignmentPct' || name === 'dteCurrent' || name === 'highPct';
                  return (
                    <td
                      className={cx(styles.td, styles.border, {
                        [styles[align]]: !!align,
                        [colour]: name === 'batchCode',
                        [accountColour]: name === 'account',
                        [styles.contrast]: rowIndex % 2 && showContrast,
                        [styles.freezeFirstTdColumn]: index === 0,
                        [styles.freezeSecondTdColumn]: index === 1,
                        [styles.dwarfed]:
                          current > high && (name === 'returnGBP' || name === 'returnPct'),
                      })}
                      key={index}
                    >
                      {(!!row[name] || showZeroValues) && format(row[name])}
                    </td>
                  );
                })}
              </tr>
            );
          })}
      </tbody>
    </table>
  );
};

export default Call;
