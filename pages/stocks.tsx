import { useEffect, useState } from 'react';
import cx from 'classnames';
import dayjs from 'dayjs';

import processData from '../utils/processData';
import { decimalTwo, pctOne, pctZero, thousands } from '../utils/format';
import { removeNullValues } from '../utils';

import {
  CurrentTickerPrices,
  StocksRow,
  StocksRowTotal,
  TradeData,
  TransactionData,
} from '../types';

import { DISPLAY } from '../constants';

// @ts-ignore
import tradesData from '../data/options.csv';
// @ts-ignore
import transactionsData from '../data/transactions.csv';
import tickers from '../data/tickers';

import styles from '../styles/Table.module.css';

const NOW = dayjs();

const calcValueGBP = (stock, currentTickerPrices, rates) => {
  const { ticker } = stock;
  const value = calcValue(stock, currentTickerPrices[ticker]);
  const { currency } = tickers[ticker];
  const forexRate = rates[currency];
  return value / forexRate;
};

const calcValue = (stock, current) => {
  const partialBatchQuantity = stock.partialBatch?.quantity || 0;
  const wheelingQuantity = stock.wheeling?.quantity || 0;
  const wheelingMissedUpside = stock.wheeling?.missedUpside || 0;
  const totalQuantity = wheelingQuantity + partialBatchQuantity;
  return totalQuantity * current - wheelingMissedUpside;
};

const Stocks = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [rates, setRates] = useState<{ [key: string]: number }>(null);
  const [currentTickerPrices, setCurrentTickerPrices] = useState<CurrentTickerPrices>(null);

  useEffect(() => {
    setIsLoading(true);
    const fetchForexRates = async () => {
      const response = await fetch('/api/forexRates');
      const data = await response.json();
      setRates(data.rates);
    };
    fetchForexRates().catch(console.error);

    const fetchAllTickerPrices = async () => {
      const response = await fetch(`/api/allTickerPrices?now=${String(NOW)}`);
      const data = await response.json();
      setCurrentTickerPrices(data.currentTickerPrices);
    };
    fetchAllTickerPrices().catch(console.error);
    setIsLoading(false);
  }, []);

  if (isLoading) return <p>Loading...</p>;
  if (!rates || !currentTickerPrices) return <p>Data missing.</p>;

  const headings: {
    name: keyof StocksRow;
    section: SectionName;
    format?: Function;
    align?: 'default' | 'right';
  }[] = [
    { name: 'ticker', section: 'ticker', align: 'default' },
    { name: 'partialBatchAcquisitionCost', section: 'partialBatch', format: thousands },
    { name: 'partialBatchQuantity', section: 'partialBatch', format: thousands },
    { name: 'putOnlyPremium', section: 'putOnly', format: thousands },
    { name: 'wheelingAcquisitionCost', section: 'wheeling', format: thousands },
    { name: 'wheelingQuantity', section: 'wheeling', format: thousands },
    { name: 'wheelingPremium', section: 'wheeling', format: thousands },
    { name: 'wheeledAcquisitionCost', section: 'wheeled', format: thousands },
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

  const trades: TradeData[] = tradesData.map(removeNullValues);
  const transactions: TransactionData[] = transactionsData.map(removeNullValues);

  const { batches, stocks } = processData(NOW, transactions, trades, currentTickerPrices);

  for (let batch of Object.values(batches)) {
    const { currentCall, netCumulativePremium, acquisitionCost, exitValue, quantity, ticker } =
      batch;

    if (exitValue) {
      stocks[ticker].wheeled = stocks[ticker].wheeled || {
        acquisitionCost: 0,
        exitValue: 0,
        quantity: 0,
        premium: 0,
      };
      const stock = stocks[ticker].wheeled;
      stock.acquisitionCost += acquisitionCost;
      stock.exitValue += exitValue;
      stock.premium += netCumulativePremium;
      stock.quantity += quantity;
    } else {
      stocks[ticker].wheeling = stocks[ticker].wheeling || {
        activeCalls: 0,
        missedUpside: 0,
        acquisitionCost: 0,
        premium: 0,
        quantity: 0,
      };

      const { strike } = currentCall || {};
      const current = currentTickerPrices[ticker];
      const missedUpside = strike ? Math.max(current - strike, 0) * quantity : 0;

      const stock = stocks[ticker].wheeling;
      stock.activeCalls += currentCall ? 1 : 0;
      stock.missedUpside += missedUpside;
      stock.acquisitionCost += acquisitionCost;
      stock.premium += netCumulativePremium;
      stock.quantity += quantity;
    }
  }

  const orderedStocks = Object.values(stocks).sort(
    (stockA, stockB) =>
      calcValueGBP(stockB, currentTickerPrices, rates) -
      calcValueGBP(stockA, currentTickerPrices, rates)
  );

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
              className={cx(styles.freezeFirstThRow, {
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
              className={cx(styles.freezeSecondThRow)}
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
          const partialBatchAcquisitionCost = stock.partialBatch?.acquisitionCost || 0;

          const wheeledAcquisitionCost = stock.wheeled?.acquisitionCost;
          const wheeledQuantity = stock.wheeled?.quantity;
          const wheeledPremium = stock.wheeled?.premium || 0;
          const wheeledExitValue = stock.wheeled?.exitValue;
          const wheeledGrowth = wheeledExitValue - wheeledAcquisitionCost;
          const wheeledReturn = wheeledPremium + wheeledGrowth || 0;

          const putOnlyPremium = stock.putOnly?.premium || 0;

          const wheelingMissedUpside = stock.wheeling?.missedUpside || 0;
          const wheelingAcquisitionCost = stock.wheeling?.acquisitionCost || 0;
          const wheelingPremium = stock.wheeling?.premium || 0;
          const wheelingQuantity = stock.wheeling?.quantity || 0;

          const totalQuantity = wheelingQuantity + partialBatchQuantity;
          const avgCost =
            totalQuantity &&
            (wheelingAcquisitionCost +
              partialBatchAcquisitionCost -
              wheeledReturn -
              wheelingPremium -
              putOnlyPremium) /
              (wheelingQuantity + partialBatchQuantity);

          const returnPct = avgCost ? current / avgCost - 1 : 0;

          const returnCurrency =
            totalQuantity * current -
            wheelingAcquisitionCost -
            partialBatchAcquisitionCost -
            wheelingMissedUpside +
            putOnlyPremium +
            wheelingPremium +
            wheeledReturn;

          const returnGBP = returnCurrency / forexRate;
          const valueGBP = calcValueGBP(stock, currentTickerPrices, rates);

          const row: StocksRow = {
            activeCalls: stock.wheeling?.activeCalls,
            avgCost,
            current,
            partialBatchAcquisitionCost,
            partialBatchQuantity,
            putOnlyPremium,
            returnGBP,
            returnPct,
            ticker,
            totalQuantity,
            valueGBP,
            wheeledAcquisitionCost,
            wheeledQuantity,
            wheeledExitValue,
            wheeledPremium,
            wheeledPremiumAsPctOfReturn: wheeledPremium / wheeledReturn,
            wheeledGrowth,
            wheeledGrowthAsPctOfReturn: wheeledGrowth / wheeledReturn,
            wheeledReturn,
            wheeledReturnPct: wheeledReturn / wheeledAcquisitionCost,
            wheelingAcquisitionCost,
            wheelingPremium,
            wheelingQuantity,
          };

          totals.returnGBP.value += returnGBP;
          totals.valueGBP.value += valueGBP;

          return (
            <tr key={rowIndex}>
              {headings.map(({ name, format = (v) => v, align = 'right' }, index) => (
                <td
                  className={cx({
                    [styles[align]]: align === 'right',
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
              className={cx(styles.total, {
                [styles[align]]: align === 'right',
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
