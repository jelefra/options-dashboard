import cx from 'classnames';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
dayjs.extend(isSameOrAfter);
import customParseFormat from 'dayjs/plugin/customParseFormat';
dayjs.extend(customParseFormat);

import {
  calcDteCurrent,
  calcDteTotal,
  calcPriceIncrease,
  calcReturnPctForPeriod,
  removeNullValues,
} from '../utils';
import { dateShortTerm, decimalTwo, pctOne, thousands } from '../utils/format';

import { Batch, CallRow, CallRowTotal, TradeData, TransactionData } from '../types';

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

  const trades: TradeData[] = tradesData.map(removeNullValues);
  const transactions: TransactionData[] = transactionsData.map(removeNullValues);

  const headings: {
    name: keyof CallRow;
    format?: Function;
    align?: 'default' | 'right';
    scope?: 'all';
  }[] = [
    { name: 'account', align: 'default', scope: 'all' },
    { name: 'batchCode', align: 'default', scope: 'all' },
    { name: 'acquisitionCost', format: decimalTwo, scope: 'all' },
    { name: 'netCost', format: decimalTwo, scope: 'all' },
    { name: 'costBasisDrop', format: pctOne, scope: 'all' },
    { name: 'returnPct', format: pctOne, scope: 'all' },
    { name: 'returnGBP', format: thousands, scope: 'all' },
    { name: 'valueGBP', format: thousands, scope: 'all' },
    { name: 'date', format: dateShortTerm, align: 'default' },
    { name: 'expiry', format: dateShortTerm, align: 'default' },
    { name: 'dteTotal' },
    { name: 'dteCurrent' },
    { name: 'tradePrice', format: decimalTwo },
    { name: 'stockPrice', format: decimalTwo },
    { name: 'current', format: decimalTwo, scope: 'all' },
    { name: 'strike', format: decimalTwo },
    { name: 'status', align: 'default' },
    { name: 'assignmentPct', format: pctOne },
    { name: 'high', format: decimalTwo },
    { name: 'highPct', format: pctOne },
    { name: 'priceIncreaseGBP', format: thousands },
    { name: 'return30DPctLastCall', format: pctOne },
    { name: 'returnGBPLastCall', format: thousands },
    { name: 'daysTotal' },
    { name: 'returnGBPIfAssigned', format: thousands },
    { name: 'returnPctIfAssigned', format: pctOne },
    { name: 'return30DPctIfAssigned', format: pctOne },
    { name: 'return1YPctIfAssigned', format: pctOne },
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

  const batchesWithCalls = Object.entries(batches)
    .filter(([, batch]) => batch.currentCall)
    .sort(([a], [b]) => a.localeCompare(b))
    .sort(([, a], [, b]) => a.account.localeCompare(b.account));

  const batchesWithoutCalls = Object.entries(batches)
    .filter(([, batch]) => !batch.currentCall)
    .sort(([a], [b]) => a.localeCompare(b))
    .sort(([, a], [, b]) => a.account.localeCompare(b.account));

  const renderTableBody = (
    batches: [string, Batch][],
    headingFilterFunction = (value) => value
  ) => {
    // eslint-disable-next-line no-unused-vars
    const totals: { [key in keyof CallRowTotal]: number } = {
      returnGBP: 0,
      returnGBPLastCall: 0,
      valueGBP: 0,
    };

    return (
      <tbody>
        {batches
          .filter(([, { exitValue }]) => !exitValue)
          .map(([, batchData], rowIndex) => {
            const orderedRowValues = headings.filter(headingFilterFunction).map((heading) => ({
              ...heading,
            }));

            const {
              account,
              acquisitionCost,
              acquisitionDate,
              currentCall,
              netCumulativePremium,
              quantity,
              ticker,
            } = batchData;
            const { commission, date, expiry, stockPrice, strike, tradePrice } = currentCall || {};
            const { colour, currency, optionSize } = tickers[ticker];
            const forexRate = rates[currency];
            const current = currentTickerPrices[ticker];

            const daysTotal = expiry?.diff(acquisitionDate, 'day');
            const high = strike + tradePrice - commission / optionSize;
            const returnPctLastCall =
              (tradePrice * optionSize - commission) / (stockPrice * optionSize);
            const dteLastCall = expiry?.diff(date, 'day');
            const netCost = acquisitionCost - netCumulativePremium;
            const returnPctIfAssigned = strike / netCost - 1;

            const priceIncrease = calcPriceIncrease(current, high, optionSize);
            const returnCurrent = (current - netCost) * optionSize;
            const returnIfAssigned = (strike - netCost) * optionSize;
            const returnLastCall = optionSize * tradePrice - commission;
            const value = quantity * current;

            const returnGBP = Math.min(returnCurrent, returnIfAssigned || Infinity) / forexRate;
            const valueGBP = value / forexRate;
            const returnGBPLastCall = returnLastCall / forexRate;

            const row: CallRow = {
              account,
              acquisitionCost,
              assignmentPct: strike / current - 1,
              batchCode: batchData.batchCode,
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
              priceIncreaseGBP: priceIncrease / forexRate,
              return1YPctIfAssigned: calcReturnPctForPeriod(returnPctIfAssigned, daysTotal, 365),
              return30DPctIfAssigned: calcReturnPctForPeriod(returnPctIfAssigned, daysTotal, 30),
              return30DPctLastCall: calcReturnPctForPeriod(returnPctLastCall, dteLastCall, 30),
              returnGBP,
              returnGBPIfAssigned: returnIfAssigned / forexRate,
              returnGBPLastCall,
              returnPct: Math.min(current, strike || Infinity) / netCost - 1,
              returnPctIfAssigned,
              status: strike < current ? 'Assignable' : null,
              stockPrice,
              strike,
              tradePrice,
              valueGBP,
            };

            totals.returnGBP += returnGBP;
            totals.returnGBPLastCall += returnGBPLastCall;
            totals.valueGBP += valueGBP;

            const accountColour = accounts[account].colour;

            return (
              <tr key={rowIndex}>
                {orderedRowValues.map(({ name, format = (v) => v, align = 'right' }, index) => {
                  const showContrast = name !== 'account' && name !== 'batchCode';
                  const showZeroValues =
                    name === 'assignmentPct' || name === 'dteCurrent' || name === 'highPct';
                  return (
                    <td
                      className={cx(styles.td, styles.border, {
                        [styles[align]]: align === 'right',
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
        <tr>
          {headings
            .filter(headingFilterFunction)
            .map(({ name, format, align = 'right' }, index) => (
              <td
                className={cx(styles.td, {
                  [styles[align]]: align === 'right',
                })}
                key={index}
              >
                {totals[name] && format(totals[name])}
              </td>
            ))}
        </tr>
      </tbody>
    );
  };

  return (
    <>
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
        {renderTableBody(batchesWithCalls)}
      </table>

      <table className={styles.table}>
        <thead>
          <tr>
            {headings
              .filter(({ scope }) => scope === 'all')
              .map(({ name }, index) => (
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
        {renderTableBody(batchesWithoutCalls, ({ scope }) => scope === 'all')}
      </table>
    </>
  );
};

export default Call;
