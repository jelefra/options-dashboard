import cx from 'classnames';
import dayjs from 'dayjs';
import Head from 'next/head';
import { useEffect, useState } from 'react';

import Loading from '../components/Loading';
import { DISPLAY } from '../constants';
// @ts-ignore
import tradesData from '../data/options.csv';
// @ts-ignore
import transactionsData from '../data/transactions.csv';
import styles from '../styles/Table.module.css';
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
import { getTickerDisplayName, isCurrentPut, removeNullValues } from '../utils';
import flatten from '../utils/flatten';
import { decimalTwo, pctOne, pctZero, thousands } from '../utils/format';
import processData from '../utils/processData';

const NOW = dayjs();

const calcValue = (stock: Stock, current: number) => {
  const partialBatchQuantity = stock.partialBatch?.quantity || 0;
  const wheelingQuantity = stock.wheeling?.quantity || 0;
  const wheelingMissedUpside = stock.wheeling?.calls?.missedUpside || 0;
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

    fetchForexRates()
      .then(() => setIsLoading(false))
      .catch(console.error);
  }, []);

  useEffect(() => {
    const fetchAllTickerPrices = async () => {
      const response = await fetch('/api/allTickerPrices');
      const data = await response.json();
      setCurrentTickerPrices(data.currentTickerPrices);
    };
    fetchAllTickerPrices().catch(console.error);
  }, []);

  if (isLoading) return <Loading />;
  if (!rates || !currentTickerPrices) return <p>Data missing.</p>;

  const headings: {
    name: keyof StocksHeadings;
    section: SectionName;
    format?: Function;
    align?: 'default' | 'right';
  }[] = [
    { name: 'ticker', section: 'ticker', align: 'default', format: getTickerDisplayName },
    { name: 'totalQuantity', section: 'summary', format: thousands },
    { name: 'wheelingCallsActiveCount', section: 'summary' },
    { name: 'avgCost', section: 'summary', format: decimalTwo },
    { name: 'current', section: 'summary', format: decimalTwo },
    { name: 'returnPct', section: 'summary', format: pctOne },
    { name: 'returnGBP', section: 'summary', format: thousands },
    { name: 'valueGBP', section: 'summary', format: thousands },
    { name: 'allocation', section: 'summary', format: pctOne },
    { name: 'wheelingPutsActiveCount', section: 'summaryWithActivePuts' },
    { name: 'wheelingPutsActiveValueGBP', section: 'summaryWithActivePuts', format: thousands },
    { name: 'allocationWithActivePuts', section: 'summaryWithActivePuts', format: pctOne },
    { name: 'wheelingPutsAssignableCount', section: 'summaryNet', format: thousands },
    { name: 'wheelingPutsAssignableValueGBP', section: 'summaryNet', format: thousands },
    { name: 'wheelingCallsAssignableCount', section: 'summaryNet' },
    { name: 'wheelingCallsAssignableValueGBP', section: 'summaryNet', format: thousands },
    { name: 'allocationNet', section: 'summaryNet', format: pctOne },
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

  type SectionName =
    | 'ticker'
    | 'partialBatch'
    | 'putOnly'
    | 'wheeling'
    | 'wheeled'
    | 'summary'
    | 'summaryWithActivePuts'
    | 'summaryNet';

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
    {
      ticker: 0,
      partialBatch: 0,
      putOnly: 0,
      wheeling: 0,
      wheeled: 0,
      summary: 0,
      summaryWithActivePuts: 0,
      summaryNet: 0,
    }
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
    summaryWithActivePuts: { name: 'summaryWithActivePuts', backgroundColor: 'WhiteSmoke' },
    summaryNet: { name: 'summaryNet', backgroundColor: 'PapayaWhip' },
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
  const currentPuts = trades.filter((trade) => isCurrentPut(trade, NOW));

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
        calls: {
          active: { count: 0, value: 0 },
          assignable: { count: 0, value: 0 },
          missedUpside: 0,
        },
        acquisitionCost: 0,
        premium: 0,
        quantity: 0,
      };

      const { strike } = currentCall || {};
      const missedUpside = strike ? Math.max(current - strike, 0) * optionSize : 0;

      const wheeling = stocks[ticker].wheeling;
      wheeling.calls.active.count += currentCall ? 1 : 0;
      wheeling.calls.active.value += currentCall ? optionSize * Math.min(strike, current) : 0;
      wheeling.calls.assignable.count += currentCall && current > strike ? 1 : 0;
      wheeling.calls.assignable.value += currentCall && current > strike ? optionSize * strike : 0;
      wheeling.calls.missedUpside += missedUpside;
      wheeling.acquisitionCost += acquisitionCost;
      wheeling.premium += netCumulativePremium;
      wheeling.quantity += optionSize;
    }
  }

  for (let currentPut of currentPuts) {
    const { ticker, strike } = currentPut;
    const { optionSize } = stocks[ticker];
    const currentStockPrice = currentTickerPrices[ticker];
    stocks[ticker].wheeling = stocks[ticker].wheeling || {
      calls: {
        active: { count: 0, value: 0 },
        assignable: { count: 0, value: 0 },
        missedUpside: 0,
      },
      acquisitionCost: 0,
      premium: 0,
      quantity: 0,
    };
    stocks[ticker].wheeling.puts = stocks[ticker].wheeling.puts || {
      active: { count: 0, value: 0 },
      assignable: { count: 0, value: 0 },
    };
    stocks[ticker].wheeling.puts.active.count += 1;
    stocks[ticker].wheeling.puts.active.value += optionSize * Math.min(strike, currentStockPrice);
    stocks[ticker].wheeling.puts.assignable.count += strike > currentStockPrice ? 1 : 0;
    stocks[ticker].wheeling.puts.assignable.value +=
      strike > currentStockPrice ? optionSize * Math.min(strike, currentStockPrice) : 0;
  }

  // eslint-disable-next-line no-unused-vars
  const totals: { [key in keyof StocksRowTotal]: { value: number; format?: Function } } = {
    returnGBP: { value: 0 },
    valueGBP: { value: 0 },
    wheelingPutsActiveValueGBP: { value: 0 },
    wheelingPutsAssignableValueGBP: { value: 0 },
    wheelingCallsAssignableValueGBP: { value: 0 },
  };

  const stockData: StockEnriched[] = Object.values(stocks).map((stock) => {
    const { currency, current, wheeling, wheeled, partialBatch, putOnly } = stock;
    const forexRate = rates[currency];

    const partialBatchQuantity = partialBatch?.quantity || 0;
    const partialBatchAcquisitionCost = partialBatch?.acquisitionCost || 0;

    const wheeledAcquisitionCost = wheeled?.acquisitionCost;
    const wheeledPremium = wheeled?.premium || 0;
    const wheeledExitValue = wheeled?.exitValue;
    const wheeledGrowth = wheeledExitValue - wheeledAcquisitionCost;
    const wheeledReturn = wheeledPremium + wheeledGrowth || 0;

    const putOnlyPremium = putOnly?.premium || 0;

    const wheelingMissedUpside = wheeling?.calls.missedUpside || 0;
    const wheelingAcquisitionCost = wheeling?.acquisitionCost || 0;
    const wheelingPremium = wheeling?.premium || 0;
    const wheelingQuantity = wheeling?.quantity || 0;

    const totalQuantity = wheelingQuantity + partialBatchQuantity;
    const avgCost =
      totalQuantity &&
      (wheelingAcquisitionCost +
        partialBatchAcquisitionCost -
        wheeledReturn -
        wheelingPremium -
        putOnlyPremium) /
        (wheelingQuantity + partialBatchQuantity);

    const returnCurrency =
      totalQuantity * current -
      wheelingAcquisitionCost -
      partialBatchAcquisitionCost -
      wheelingMissedUpside +
      putOnlyPremium +
      wheelingPremium +
      wheeledReturn;

    const returnGBP = current || totalQuantity === 0 ? returnCurrency / forexRate : null;
    const valueGBP = current && forexRate ? calcValue(stock, current) / forexRate : null;
    const wheelingPutsActiveValueGBP = current
      ? (wheeling?.puts?.active?.value || 0) / forexRate
      : null;
    const wheelingPutsAssignableValueGBP = current
      ? (wheeling?.puts?.assignable?.value || 0) / forexRate
      : null;
    const wheelingCallsActiveValueGBP = current
      ? (wheeling?.calls?.active?.value || 0) / forexRate
      : null;
    const wheelingCallsAssignableValueGBP = current
      ? (wheeling?.calls?.assignable?.value || 0) / forexRate
      : null;

    const returnPct = current && avgCost ? returnGBP / (valueGBP - returnGBP) : null;

    totals.returnGBP.value += returnGBP;
    totals.valueGBP.value += valueGBP;
    totals.wheelingPutsActiveValueGBP.value += wheelingPutsActiveValueGBP;
    totals.wheelingPutsAssignableValueGBP.value += wheelingPutsAssignableValueGBP;
    totals.wheelingCallsAssignableValueGBP.value += wheelingCallsAssignableValueGBP;

    return {
      ...stock,
      avgCost,
      current,
      returnGBP,
      returnPct,
      totalQuantity,
      valueGBP,
      missingUpside: !!wheelingMissedUpside,
      ...(partialBatch && {
        partialBatch: { ...partialBatch },
      }),
      ...(putOnly && {
        putOnly: { ...putOnly, premiumGBP: putOnlyPremium / forexRate },
      }),
      ...(wheeled && {
        wheeled: {
          ...wheeled,
          growth: wheeledGrowth,
          growthAsPctOfReturn: wheeledGrowth / wheeledReturn,
          premiumAsPctOfReturn: wheeledPremium / wheeledReturn,
          return: wheeledReturn,
          returnPct: wheeledReturn / wheeledAcquisitionCost,
        },
      }),
      ...(wheeling && {
        wheeling: {
          ...wheeling,
          puts: {
            active: {
              count: wheeling.puts?.active?.count,
              value: wheeling.puts?.active?.value,
              valueGBP: wheelingPutsActiveValueGBP,
            },
            assignable: {
              count: wheeling.puts?.assignable?.count,
              value: wheeling.puts?.assignable?.value,
              valueGBP: wheelingPutsAssignableValueGBP,
            },
          },
          calls: {
            missedUpside: wheelingMissedUpside,
            active: {
              count: wheeling.calls?.active?.count,
              value: wheeling.calls?.active?.value,
              valueGBP: wheelingCallsActiveValueGBP,
            },
            assignable: {
              count: wheeling.calls?.assignable?.count,
              value: wheeling.calls?.assignable?.value,
              valueGBP: wheelingCallsAssignableValueGBP,
            },
          },
        },
      }),
    };
  });

  const rows: StockEnriched[] = stockData
    .map((stockData) => ({
      ...stockData,
      allocation: stockData.valueGBP / totals.valueGBP.value,
      allocationWithActivePuts:
        (stockData.valueGBP + (stockData.wheeling?.puts?.active?.valueGBP || 0)) /
        (totals.valueGBP.value + totals.wheelingPutsActiveValueGBP.value),
      allocationNet:
        (stockData.valueGBP +
          (stockData.wheeling?.puts?.assignable?.valueGBP || 0) -
          (stockData.wheeling?.calls?.assignable?.valueGBP || 0)) /
        (totals.valueGBP.value +
          totals.wheelingPutsAssignableValueGBP.value -
          totals.wheelingCallsAssignableValueGBP.value),
    }))
    .sort((stockA, stockB) => stockB.returnGBP - stockA.returnGBP)
    .sort((stockA, stockB) => stockB.valueGBP - stockA.valueGBP);

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
              {headings.map(({ name, format = (v) => v, align = 'right' }, index) => {
                const showZeroValues =
                  name === 'wheeledGrowth' || name === 'wheeledGrowthAsPctOfReturn';

                return (
                  <td
                    className={cx({
                      [styles[align]]: align === 'right',
                      [row.colour]: row.colour && name === 'ticker',
                      [styles.contrast]: rowIndex % 2 && index > 0,
                      [styles.freezeFirstTdColumn]: index === 0,
                      [styles.warning]:
                        row.missingUpside &&
                        (name === 'valueGBP' || name === 'returnGBP' || name === 'returnPct'),
                    })}
                    key={index}
                  >
                    {(!!flatten(row)[name] || showZeroValues) && format(flatten(row)[name])}
                  </td>
                );
              })}
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
