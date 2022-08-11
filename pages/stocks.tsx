import { createClient } from 'redis';
import { GetServerSideProps } from 'next';
import cx from 'classnames';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
dayjs.extend(isSameOrAfter);
import customParseFormat from 'dayjs/plugin/customParseFormat';
dayjs.extend(customParseFormat);

import get from '../utils/get';
import fetchAllTickerPrices from '../utils/fetchAllTickerPrices';
import getForexRates from '../utils/getForexRates';
import { decimalTwo, pctOne, pctZero, thousands } from '../utils/format';
import { convertToGBP } from '../utils';
import { factorStockSplit } from '../utils/factorStockSplit';

import { BatchMinimal, StocksRow, StocksRowTotal, TradeData, TransactionData } from '../types';

import { DISPLAY, INPUT_DATE_FORMAT, ONE_HOUR_IN_SECONDS } from '../constants';

// @ts-ignore
import trades from '../data/options.csv';
// @ts-ignore
import transactions from '../data/transactions.csv';
import tickers from '../data/tickers';

import styles from '../styles/Table.module.css';

const NOW = dayjs();

export const getServerSideProps: GetServerSideProps = async () => {
  const client = createClient();
  await client.connect();
  const currentTickerPrices = await get({
    client,
    fetchFn: fetchAllTickerPrices,
    keyName: 'allTickerPrices',
    now: NOW,
  });
  const rates = await get({
    client,
    fetchFn: getForexRates,
    keyName: 'rates',
    expiry: ONE_HOUR_IN_SECONDS,
  });

  return { props: { currentTickerPrices, rates, trades, transactions } };
};

const Stocks = ({
  currentTickerPrices,
  rates,
  trades,
  transactions,
}: {
  currentTickerPrices: { [key: string]: number };
  rates: { [key: string]: number };
  trades: TradeData[];
  transactions: TransactionData[];
}) => {
  const headings: {
    name: keyof StocksRow;
    section: SectionName;
    format?: Function;
    align?: string;
  }[] = [
    { name: 'ticker', section: 'ticker', align: 'default' },
    { name: 'partialBatchNetCost', section: 'partialBatch', format: thousands },
    { name: 'partialBatchQuantity', section: 'partialBatch', format: thousands },
    { name: 'putOnlyPremium', section: 'putOnly', format: thousands },
    { name: 'wheelingGrossCost', section: 'wheeling', format: thousands },
    { name: 'wheelingQuantity', section: 'wheeling', format: thousands },
    { name: 'wheelingPremium', section: 'wheeling', format: thousands },
    { name: 'wheeledGrossCost', section: 'wheeled', format: thousands },
    { name: 'wheeledQuantity', section: 'wheeled' },
    { name: 'wheeledExitValue', section: 'wheeled', format: thousands },
    { name: 'wheeledPremium', section: 'wheeled', format: thousands },
    { name: 'wheeledPremiumAsPctOfReturn', section: 'wheeled', format: pctZero },
    { name: 'wheeledGrowth', section: 'wheeled', format: thousands },
    { name: 'wheeledGrowthAsPctOfReturn', section: 'wheeled', format: pctZero },
    { name: 'wheeledReturn', section: 'wheeled', format: thousands },
    { name: 'wheeledReturnPct', section: 'wheeled', format: pctZero },
    { name: 'totalQuantity', section: 'summary', format: thousands },
    { name: 'activeCalls', section: 'summary' },
    { name: 'avgCost', section: 'summary', format: decimalTwo },
    { name: 'current', section: 'summary', format: decimalTwo },
    { name: 'returnPct', section: 'summary', format: pctOne },
    { name: 'returnGBP', section: 'summary', format: thousands },
    { name: 'valueGBP', section: 'summary', format: thousands },
  ];

  type SectionName = 'ticker' | 'partialBatch' | 'putOnly' | 'wheeling' | 'wheeled' | 'summary';
  type Section = {
    name: SectionName;
    backgroundColor: string;
    count?: number;
    rowSpan?: number;
  };

  // eslint-disable-next-line no-unused-vars
  const sectionHeadingsCount: { [key in SectionName]: number } = headings.reduce(
    (sections, heading) => {
      sections[heading.section] += 1;
      return sections;
    },
    { ticker: 0, partialBatch: 0, putOnly: 0, wheeling: 0, wheeled: 0, summary: 0 }
  );

  const uniqueSectionsOrdered: SectionName[] = headings
    .map(({ section }) => section)
    .reduce((uniqueSectionsOrdered, sectionName) => {
      if (!uniqueSectionsOrdered.includes(sectionName)) {
        uniqueSectionsOrdered.push(sectionName);
      }
      return uniqueSectionsOrdered;
    }, []);

  // eslint-disable-next-line no-unused-vars
  const sections: { [key in SectionName]: Section } = {
    ticker: { name: 'ticker', backgroundColor: 'GhostWhite', rowSpan: 2 },
    partialBatch: { name: 'partialBatch', backgroundColor: 'Linen' },
    putOnly: { name: 'putOnly', backgroundColor: 'AliceBlue' },
    wheeling: { name: 'wheeling', backgroundColor: 'Honeydew' },
    wheeled: { name: 'wheeled', backgroundColor: 'LemonChiffon' },
    summary: { name: 'summary', backgroundColor: 'AntiqueWhite' },
  };

  const sectionsWithCounts = uniqueSectionsOrdered.map((section) => ({
    name: section,
    backgroundColor: sections[section].backgroundColor,
    count: sectionHeadingsCount[section],
    rowSpan: sections[section].rowSpan || 1,
  }));

  const stocks: {
    [key: string]: {
      ticker: string;
      partialBatch?: {
        netCost: number;
        quantity: number;
      };
      putOnly?: {
        premium: number;
      };
      wheeled?: {
        exitValue?: number;
        grossCost: number;
        premium: number;
        quantity: number;
      };
      wheeling?: {
        activeCalls: number;
        grossCost: number;
        premium: number;
        quantity: number;
        missedUpside: number;
      };
    };
  } = Object.fromEntries(
    Object.keys(currentTickerPrices).map((ticker) => [ticker, { ticker: ticker }])
  );

  const batches: { [key: string]: BatchMinimal } = {};

  for (let transaction of transactions) {
    const {
      batchCodes: batchCodesStr,
      commission,
      date,
      quantity,
      stockPrice,
      ticker,
      type,
    } = transaction;

    if (type === 'Purchase') {
      if (batchCodesStr) {
        const batchCodes = batchCodesStr.includes(',') ? batchCodesStr.split(',') : [batchCodesStr];

        for (let batchCode of batchCodes) {
          batches[batchCode] = batches[batchCode] || {
            batchCode,
            netCumulativePremium: 0,
            grossCost: 0,
            quantity: 0,
            ticker,
          };

          const batch = batches[batchCode];
          const batchQuantity = quantity / batchCodes.length;
          const oldGrossCost = batch.grossCost;
          const oldQuantity = batch.quantity;
          batch.grossCost =
            (oldGrossCost * oldQuantity + stockPrice * batchQuantity) /
            (oldQuantity + batchQuantity);
          batch.netCumulativePremium -= commission / batchQuantity;
          batch.quantity += batchQuantity;
        }
      } else {
        stocks[ticker].partialBatch = stocks[ticker].partialBatch || { netCost: 0, quantity: 0 };
        const partialBatch = stocks[ticker].partialBatch;
        partialBatch.netCost += stockPrice * quantity + commission;
        partialBatch.quantity += factorStockSplit(ticker, quantity, dayjs(date, INPUT_DATE_FORMAT));
      }
    }

    // TODO
    // if (type === 'Sale' && batchCodes) {
    //   ...
    // }
  }

  for (let trade of trades) {
    const { batchCode, closePrice, commission, strike, ticker, tradePrice, type } = trade;

    const { optionSize } = tickers[ticker];

    // Puts
    if (type === 'Put') {
      // Assigned puts
      if (type === 'Put' && closePrice && closePrice < strike) {
        batches[batchCode] = {
          batchCode,
          netCumulativePremium: tradePrice - commission / optionSize,
          grossCost: strike,
          quantity: optionSize,
          ticker,
        };
      } else {
        // Put only (including current assignable puts)
        const { ticker, tradePrice } = trade;
        stocks[ticker].putOnly = stocks[ticker].putOnly || { premium: 0 };
        stocks[ticker].putOnly.premium += tradePrice * optionSize;
      }
    }

    // Wheeling previously assigned puts
    if (type === 'Call') {
      const batch = batches[batchCode];
      batch.netCumulativePremium += tradePrice - commission / optionSize;

      // Current calls
      const expiry = dayjs(trade.expiry, INPUT_DATE_FORMAT);
      if (expiry.isSameOrAfter(NOW, 'day')) {
        batch.currentCall = {
          strike: trade.strike,
        };
      }

      // Assigned calls
      if (closePrice && closePrice > strike) {
        batch.exitValue = strike * optionSize;
      }
    }
  }

  for (let batch of Object.values(batches)) {
    const { currentCall, netCumulativePremium, grossCost, exitValue, quantity, ticker } = batch;

    if (exitValue) {
      stocks[ticker].wheeled = stocks[ticker].wheeled || {
        grossCost: 0,
        exitValue: 0,
        quantity: 0,
        premium: 0,
      };
      const stock = stocks[ticker].wheeled;
      const { optionSize } = tickers[ticker];
      stock.exitValue += exitValue;
      stock.grossCost += grossCost * optionSize;
      stock.premium += netCumulativePremium * optionSize;
      stock.quantity += quantity;
    } else {
      stocks[ticker].wheeling = stocks[ticker].wheeling || {
        activeCalls: 0,
        missedUpside: 0,
        grossCost: 0,
        premium: 0,
        quantity: 0,
      };

      const { strike } = currentCall || {};
      const current = currentTickerPrices[ticker];
      const { optionSize } = tickers[ticker];
      const missedUpside = strike ? Math.max(current - strike, 0) * optionSize : 0;

      const stock = stocks[ticker].wheeling;
      stock.missedUpside += missedUpside;
      stock.grossCost += grossCost * optionSize;
      stock.premium += netCumulativePremium * optionSize;
      stock.quantity += quantity;
      stock.activeCalls += currentCall ? 1 : 0;
    }
  }

  const orderedStocks = Object.values(stocks).sort((stockA, stockB) => {
    const calcValue = (stock, currentTickerPrices) => {
      const partialBatchQuantity = stock.partialBatch?.quantity || 0;
      const wheelingQuantity = stock.wheeling?.quantity || 0;
      const totalQuantity = wheelingQuantity + partialBatchQuantity;
      return totalQuantity * currentTickerPrices[stock.ticker];
    };

    const valueA = calcValue(stockA, currentTickerPrices);
    const valueB = calcValue(stockB, currentTickerPrices);
    return valueB - valueA;
  });

  // eslint-disable-next-line no-unused-vars
  const totals: { [key in keyof StocksRowTotal]: { value: number; format?: Function } } = {
    returnGBP: { value: 0 },
    valueGBP: { value: 0 },
  };

  return (
    <table className={styles.table}>
      <thead>
        <tr className={styles.thirtyPx}>
          {sectionsWithCounts.map(({ count, name, rowSpan, backgroundColor }, index) => (
            <th
              className={cx(styles.th, styles.freezeFirstThRow, {
                [styles.freezeFirstThCell]: index === 0,
              })}
              style={{ backgroundColor }}
              colSpan={count}
              rowSpan={rowSpan}
              key={index}
            >
              {DISPLAY[name] || name}
            </th>
          ))}
        </tr>
        <tr className={styles.thirtyPx}>
          {headings.slice(1).map(({ name, section }, index) => (
            <th
              className={cx(styles.th, styles.freezeSecondThRow)}
              style={{ backgroundColor: sections[section].backgroundColor }}
              key={index}
            >
              {DISPLAY[name] || name}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {orderedStocks.map((stock, rowIndex) => {
          const { ticker } = stock;
          const { colour, currency } = tickers[ticker];
          const current = currentTickerPrices[ticker];
          const forexRate = rates[currency];

          const partialBatchQuantity = stock.partialBatch?.quantity || 0;
          const partialBatchNetCost = stock.partialBatch?.netCost || 0;

          const wheeledGrossCost = stock.wheeled?.grossCost;
          const wheeledQuantity = stock.wheeled?.quantity;
          const wheeledPremium = stock.wheeled?.premium || 0;
          const wheeledExitValue = stock.wheeled?.exitValue;
          const wheeledGrowth = wheeledExitValue - wheeledGrossCost;
          const wheeledReturn = wheeledPremium + wheeledGrowth || 0;

          const putOnlyPremium = stock.putOnly?.premium || 0;

          const wheelingMissedUpside = stock.wheeling?.missedUpside || 0;
          const wheelingGrossCost = stock.wheeling?.grossCost || 0;
          const wheelingPremium = stock.wheeling?.premium || 0;
          const wheelingQuantity = stock.wheeling?.quantity || 0;

          const totalQuantity = wheelingQuantity + partialBatchQuantity;
          const avgCost =
            totalQuantity &&
            (wheelingGrossCost +
              partialBatchNetCost -
              wheeledReturn -
              wheelingPremium -
              putOnlyPremium) /
              (wheelingQuantity + partialBatchQuantity);

          const returnPct = avgCost ? current / avgCost - 1 : 0;

          const returnCurrency =
            totalQuantity * current -
            wheelingGrossCost -
            partialBatchNetCost -
            wheelingMissedUpside +
            putOnlyPremium +
            wheelingPremium +
            wheeledReturn;
          const value = totalQuantity * current - wheelingMissedUpside;

          const returnGBP = convertToGBP(returnCurrency, forexRate);
          const valueGBP = convertToGBP(value, forexRate);

          const row: StocksRow = {
            activeCalls: stock.wheeling?.activeCalls,
            avgCost,
            current,
            partialBatchNetCost,
            partialBatchQuantity,
            putOnlyPremium,
            returnGBP,
            returnPct,
            ticker,
            totalQuantity,
            valueGBP,
            wheeledGrossCost,
            wheeledQuantity,
            wheeledExitValue,
            wheeledPremium,
            wheeledPremiumAsPctOfReturn: wheeledPremium / wheeledReturn,
            wheeledGrowth,
            wheeledGrowthAsPctOfReturn: wheeledGrowth / wheeledReturn,
            wheeledReturn,
            wheeledReturnPct: wheeledReturn / wheeledGrossCost,
            wheelingGrossCost,
            wheelingPremium,
            wheelingQuantity,
          };

          totals.returnGBP.value += returnGBP;
          totals.valueGBP.value += valueGBP;

          return (
            <tr key={rowIndex}>
              {headings.map(({ name, format = (v) => v, align = 'right' }, index) => (
                <td
                  className={cx(styles.td, styles.border, {
                    [styles[align]]: !!align,
                    [colour]: name === 'ticker',
                    [styles.contrast]: rowIndex % 2 && index > 0,
                    [styles.freezeFirstTdColumn]: index === 0,
                  })}
                  key={index}
                >
                  {!!row[name] && format(row[name])}
                </td>
              ))}
            </tr>
          );
        })}

        <tr>
          {headings.map(({ name, format, align = 'right' }, index) => (
            <td
              className={cx(styles.td, {
                [styles[align]]: !!align,
              })}
              key={index}
            >
              {totals[name]?.value && format(totals[name].value)}
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  );
};

export default Stocks;
