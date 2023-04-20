import { useEffect, useState } from 'react';
import Head from 'next/head';
import cx from 'classnames';
import dayjs from 'dayjs';

import Loading from '../components/Loading';

import processData from '../utils/processData';
import { decimalTwo, pctOne, pctZero, thousands } from '../utils/format';
import { removeNullValues } from '../utils';
import flatten from '../utils/flatten';

import {
  CurrentTickerPrices,
  ForexRates,
  Stock,
  StockEnriched,
  StocksHeadings,
  StocksRowTotal,
  TradeData,
  TransactionData,
} from '../types';

import { DISPLAY } from '../constants';

// @ts-ignore
import tradesData from '../data/options.csv';
// @ts-ignore
import transactionsData from '../data/transactions.csv';

import styles from '../styles/Table.module.css';

const NOW = dayjs();

const calcValueGBP = (
  stock: Stock,
  currentTickerPrices: CurrentTickerPrices,
  rates: ForexRates
) => {
  const { currency, current } = stock;
  const value = calcValue(stock, current);
  const forexRate = rates[currency];
  return value / forexRate;
};

const calcValue = (stock: Stock, current: number) => {
  const partialBatchQuantity = stock.partialBatch?.quantity || 0;
  const wheelingQuantity = stock.wheeling?.quantity || 0;
  const wheelingMissedUpside = stock.wheeling?.missedUpside || 0;
  const totalQuantity = wheelingQuantity + partialBatchQuantity;
  return totalQuantity * current - wheelingMissedUpside;
};

const Stocks = () => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [rates, setRates] = useState<ForexRates>(null);
  const [currentTickerPrices, setCurrentTickerPrices] = useState<CurrentTickerPrices>(null);

  useEffect(() => {
    const fetchForexRates = async () => {
      const response = await fetch('/api/forexRates');
      const data = await response.json();
      setRates(data.rates);
    };

    const fetchAllTickerPrices = async () => {
      const response = await fetch(`/api/allTickerPrices?now=${String(NOW)}`);
      const data = await response.json();
      setCurrentTickerPrices(data.currentTickerPrices);
    };

    Promise.all([fetchForexRates(), fetchAllTickerPrices()])
      .then(() => setIsLoading(false))
      .catch(console.error);
  }, []);

  if (isLoading) return <Loading />;
  if (!rates || !currentTickerPrices) return <p>Data missing.</p>;

  const headings: {
    name: keyof StocksHeadings;
    section: SectionName;
    format?: Function;
    align?: 'default' | 'right';
  }[] = [
    { name: 'ticker', section: 'ticker', align: 'default' },
    { name: 'totalQuantity', section: 'summary', format: thousands },
    { name: 'wheelingActiveCalls', section: 'summary' },
    { name: 'avgCost', section: 'summary', format: decimalTwo },
    { name: 'current', section: 'summary', format: decimalTwo },
    { name: 'returnPct', section: 'summary', format: pctOne },
    { name: 'returnGBP', section: 'summary', format: thousands },
    { name: 'valueGBP', section: 'summary', format: thousands },
    { name: 'allocation', section: 'summary', format: pctOne },
    { name: 'wheelingAcquisitionCost', section: 'wheeling', format: thousands },
    { name: 'wheelingQuantity', section: 'wheeling', format: thousands },
    { name: 'wheelingPremium', section: 'wheeling', format: thousands },
    { name: 'putOnlyPremium', section: 'putOnly', format: thousands },
    { name: 'wheeledAcquisitionCost', section: 'wheeled', format: thousands },
    { name: 'wheeledQuantity', section: 'wheeled' },
    { name: 'wheeledExitValue', section: 'wheeled', format: thousands },
    { name: 'wheeledPremium', section: 'wheeled', format: thousands },
    { name: 'wheeledPremiumAsPctOfReturn', section: 'wheeled', format: pctZero },
    { name: 'wheeledGrowth', section: 'wheeled', format: thousands },
    { name: 'wheeledGrowthAsPctOfReturn', section: 'wheeled', format: pctZero },
    { name: 'wheeledReturn', section: 'wheeled', format: thousands },
    { name: 'wheeledReturnPct', section: 'wheeled', format: pctZero },
    { name: 'partialBatchAcquisitionCost', section: 'partialBatch', format: thousands },
    { name: 'partialBatchQuantity', section: 'partialBatch', format: thousands },
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

  const { batches, stocks } = processData({ transactions, trades, currentTickerPrices, now: NOW });

  for (let batch of Object.values(batches)) {
    const {
      acquisitionCost,
      current,
      currentCall,
      exitValue,
      netCumulativePremium,
      optionSize,
      ticker,
    } = batch;

    if (exitValue) {
      stocks[ticker].wheeled = stocks[ticker].wheeled || {
        acquisitionCost: 0,
        exitValue: 0,
        quantity: 0,
        premium: 0,
      };
      const wheeled = stocks[ticker].wheeled;
      wheeled.acquisitionCost += acquisitionCost;
      wheeled.exitValue += exitValue;
      wheeled.premium += netCumulativePremium;
      wheeled.quantity += optionSize;
    } else {
      stocks[ticker].wheeling = stocks[ticker].wheeling || {
        activeCalls: 0,
        missedUpside: 0,
        acquisitionCost: 0,
        premium: 0,
        quantity: 0,
      };

      const { strike } = currentCall || {};
      const missedUpside = strike ? Math.max(current - strike, 0) * optionSize : 0;

      const wheeling = stocks[ticker].wheeling;
      wheeling.activeCalls += currentCall ? 1 : 0;
      wheeling.missedUpside += missedUpside;
      wheeling.acquisitionCost += acquisitionCost;
      wheeling.premium += netCumulativePremium;
      wheeling.quantity += optionSize;
    }
  }

  // eslint-disable-next-line no-unused-vars
  const totals: { [key in keyof StocksRowTotal]: { value: number; format?: Function } } = {
    returnGBP: { value: 0 },
    valueGBP: { value: 0 },
  };

  const stockData: StockEnriched[] = Object.values(stocks).map((stock) => {
    const { currency, current } = stock;
    const forexRate = rates[currency];

    const partialBatchQuantity = stock.partialBatch?.quantity || 0;
    const partialBatchAcquisitionCost = stock.partialBatch?.acquisitionCost || 0;

    const wheeledAcquisitionCost = stock.wheeled?.acquisitionCost;
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

    const returnPct = current && avgCost && current / avgCost - 1;

    const returnCurrency =
      totalQuantity * current -
      wheelingAcquisitionCost -
      partialBatchAcquisitionCost -
      wheelingMissedUpside +
      putOnlyPremium +
      wheelingPremium +
      wheeledReturn;

    const returnGBP = (current || totalQuantity === 0) && returnCurrency / forexRate;
    const valueGBP = calcValueGBP(stock, currentTickerPrices, rates);

    totals.returnGBP.value += returnGBP;
    totals.valueGBP.value += valueGBP;

    return {
      ...stock,
      avgCost,
      current,
      returnGBP,
      returnPct,
      totalQuantity,
      valueGBP,
      ...(stock.partialBatch && {
        partialBatch: { ...stock.partialBatch },
      }),
      ...(stock.putOnly && {
        putOnly: { ...stock.putOnly, premiumGBP: putOnlyPremium / forexRate },
      }),
      ...(stock.wheeled && {
        wheeled: {
          ...stock.wheeled,
          growth: wheeledGrowth,
          growthAsPctOfReturn: wheeledGrowth / wheeledReturn,
          premiumAsPctOfReturn: wheeledPremium / wheeledReturn,
          return: wheeledReturn,
          returnPct: wheeledReturn / wheeledAcquisitionCost,
        },
      }),
      ...(stock.wheeling && {
        wheeling: { ...stock.wheeling },
      }),
    };
  });

  const rows: StockEnriched[] = stockData
    .map((stockData) => {
      const valueGBP = stockData.valueGBP;
      stockData.allocation = valueGBP / totals.valueGBP.value;
      return stockData;
    })
    .sort((stockA, stockB) =>
      !(
        stockA.partialBatch?.quantity ||
        stockA.wheeling?.quantity ||
        stockB.partialBatch?.quantity ||
        stockB.wheeling?.quantity
      )
        ? stockB.returnGBP - stockA.returnGBP
        : stockB.valueGBP - stockA.valueGBP
    );

  return (
    <>
      <Head>
        <title>Stocks</title>
        <link rel="icon" href="/stocks.ico" />
      </Head>
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
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {headings.map(({ name, format = (v) => v, align = 'right' }, index) => (
                <td
                  className={cx({
                    [styles[align]]: align === 'right',
                    [row.colour]: row.colour && name === 'ticker',
                    [styles.contrast]: rowIndex % 2 && index > 0,
                    [styles.freezeFirstTdColumn]: index === 0,
                  })}
                  key={index}
                >
                  {!!flatten(row)[name] && format(flatten(row)[name])}
                </td>
              ))}
            </tr>
          ))}

          <tr>
            {headings.map(({ name, format, align = 'right' }, index) => (
              <td
                className={cx(styles.total, {
                  [styles[align]]: align === 'right',
                })}
                key={index}
              >
                {!!totals[name]?.value && format(totals[name].value)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </>
  );
};

export default Stocks;
