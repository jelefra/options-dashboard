import cx from 'classnames';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import Head from 'next/head';
import { useEffect, useState } from 'react';
dayjs.extend(customParseFormat);

import CloseTradePriceInput from '../components/CloseTradePriceInput';
import Loading from '../components/Loading';
import { DISPLAY, INPUT_DATE_FORMAT, MINIMUM_RETURN_THRESHOLD } from '../constants';
import accounts from '../data/accounts';
import earnings from '../data/earnings';
// @ts-ignore
import tradesData from '../data/options.csv';
import tickers from '../data/tickers';
import styles from '../styles/Table.module.css';
import {
  CurrentTickerPrices,
  ForexRates,
  Position,
  Positions,
  PutData,
  PutRow,
  PutRowTotal,
  TradeData,
} from '../types';
import {
  areSamePut,
  calcDteCurrent,
  calcDteTotal,
  calcPriceIncrease,
  calcPutDifference,
  calcReturnPctForPeriod,
  categoriseEarnings,
  formatDaysToEarnings,
  getPosition,
  getPositionsKeys,
  isCurrentPut,
  removeNullValues,
} from '../utils';
import { dateShortTerm, decimalTwo, pctOne, pctZero, thousands } from '../utils/format';

const NOW = dayjs();

const sortPuts = (puts: PutData[]) =>
  puts
    .sort((a, b) => a.ticker.localeCompare(b.ticker))
    .sort((a, b) => a.account.localeCompare(b.account));

const Put = () => {
  const trades: TradeData[] = tradesData.map(removeNullValues);
  const currentPutsSorted = sortPuts(
    trades.filter((trade) => isCurrentPut(trade, NOW)) as PutData[]
  );
  const putsGrouped = currentPutsSorted.reduce(
    (grouped: (PutData & { quantity: number })[], putData) => {
      const [last] = grouped.slice(-1);
      if (areSamePut(last, putData)) {
        grouped.pop();
        grouped.push({ ...putData, quantity: last.quantity + 1 });
      } else {
        grouped.push({ ...putData, quantity: 1 });
      }
      return grouped;
    },
    []
  );
  const putIds = putsGrouped.map(({ ticker }, index) => `${index}-${ticker}`).join(',');
  const positionsKeys = getPositionsKeys(accounts);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [closeTradePrices, setCloseTradePrices] = useState<{ [key: string]: number | null }>({});
  const [rates, setRates] = useState<ForexRates | null>(null);
  const [currentTickerPrices, setCurrentTickerPrices] = useState<CurrentTickerPrices | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);

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
    const fetchPutTickerPrices = async () => {
      const response = await fetch(`/api/putTickerPrices?now=${String(NOW)}`);
      const data = await response.json();
      setCurrentTickerPrices(data.currentTickerPrices);
    };
    fetchPutTickerPrices().catch(console.error);
  }, []);

  useEffect(() => {
    const fetchPutCloseTradePrices = async () => {
      const response = await fetch(`/api/getRedisKeys?keys=${putIds}`);
      const data = await response.json();
      setCloseTradePrices(data.values);
    };
    fetchPutCloseTradePrices().catch(console.error);
  }, [putIds]);

  useEffect(() => {
    const fetchPositions = async () => {
      const response = await fetch(`/api/getRedisKeys?keys=${positionsKeys}`);
      const data: { values: Positions } = await response.json();
      setPositions(
        Object.values(data.values)
          .flatMap((positionsTimestamped) => positionsTimestamped?.allData)
          .filter(Boolean)
      );
    };
    fetchPositions().catch(console.error);
  }, [positionsKeys]);

  if (isLoading) return <Loading />;
  if (!rates || !currentTickerPrices) return <p>Data missing.</p>;

  const headings: {
    name: keyof PutRow;
    format?: Function;
    align?: 'default' | 'right';
  }[] = [
    { name: 'account', align: 'default' },
    { name: 'ticker', align: 'default' },
    { name: 'quantity' },
    { name: 'date', format: dateShortTerm, align: 'default' },
    { name: 'expiry', format: dateShortTerm, align: 'default' },
    { name: 'dteTotal' },
    { name: 'dteCurrent' },
    { name: 'daysToEarnings', format: formatDaysToEarnings, align: 'default' },
    { name: 'tradePrice', format: decimalTwo },
    { name: 'marketPrice', format: decimalTwo },
    { name: 'optionReturnPct', format: pctOne },
    { name: 'stockPrice', format: decimalTwo },
    { name: 'strike', format: decimalTwo },
    { name: 'current', format: decimalTwo },
    { name: 'status', align: 'default' },
    { name: 'low', format: decimalTwo },
    { name: 'lowPct', format: pctOne },
    { name: 'assignmentPct', format: pctOne },
    { name: 'high', format: decimalTwo },
    { name: 'highPct', format: pctOne },
    { name: 'priceIncreaseGBP', format: thousands },
    { name: 'return30DPctExpected', format: pctOne },
    { name: 'return30DPctEffective', format: pctOne },
    { name: 'closeTradePrice' },
    { name: 'return30DPctResidual', format: pctOne },
    { name: 'return30DPctResidualEstimate', format: pctOne },
    { name: 'cashEquivalentGBP', format: thousands },
    { name: 'returnGBP', format: thousands },
    { name: 'differenceGBP', format: thousands },
  ];

  // eslint-disable-next-line no-unused-vars
  const totals: { [key in keyof PutRowTotal]: { value: number; format?: Function } } = {
    cashEquivalentGBP: { value: 0 },
    returnGBP: { value: 0 },
    differenceGBP: { value: 0 },
    status: { value: 0, format: pctZero },
  };

  const countOfTrades = trades.filter((trade) => isCurrentPut(trade, NOW)).length;

  return (
    <>
      <Head>
        <title>Puts</title>
        <link rel="icon" href="/put.ico" />
      </Head>
      <table className={styles.table}>
        <thead>
          <tr>
            {headings.map(({ name }, index) => (
              <th
                className={cx(styles.white, styles.freezeFirstThRow, styles.rotate, {
                  [styles.freezeFirstThCell]: index === 0,
                  [styles.freezeSecondThCell]: index === 1,
                  [styles.columnWidthMd]: name === 'account' || name === 'return30DPctResidual',
                })}
                key={index}
              >
                {DISPLAY[name] || name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {putsGrouped.map((trade, tradeIndex) => {
            const orderedRowValues = headings.map((heading) => ({ ...heading }));

            const { account, ticker, tradePrice, strike, commission, stockPrice, type, quantity } =
              trade;
            const accountColour = accounts[account].colour;
            const { optionSize, currency, colour } = tickers[ticker];
            if (!optionSize) {
              throw new Error(`Option size missing for ${ticker}`);
            }
            const current = currentTickerPrices[ticker];
            const forexRate = rates[currency];

            const date = dayjs(trade.date, INPUT_DATE_FORMAT);
            const expiry = dayjs(trade.expiry, INPUT_DATE_FORMAT);
            const dteTotal = calcDteTotal(expiry, date);
            const earningsDate = dayjs(earnings[ticker]?.date, INPUT_DATE_FORMAT);
            const daysToEarnings = earningsDate.diff(expiry, 'day');
            const low = strike - tradePrice - commission / optionSize;
            const high = stockPrice + tradePrice + commission / optionSize;
            const cashEquivalent = optionSize * strike * quantity;
            const netReturn = (optionSize * tradePrice + commission) * quantity;
            const netReturnPct = netReturn / cashEquivalent;
            const priceIncrease = quantity * calcPriceIncrease(current, high, optionSize);
            const difference = quantity * calcPutDifference(strike, current, optionSize);
            const effectiveNetReturn = netReturn + difference;
            const effectiveNetReturnPct = effectiveNetReturn / cashEquivalent;
            const return30DPctExpected = calcReturnPctForPeriod(netReturnPct, dteTotal, 30);
            const return30DPctEffective =
              current && difference && calcReturnPctForPeriod(effectiveNetReturnPct, dteTotal, 30);

            const batchId = `${tradeIndex}-${ticker}`;
            const closeTradePrice = closeTradePrices[batchId];

            const effectiveCloseNetReturn = closeTradePrice
              ? closeTradePrice > 0
                ? optionSize * closeTradePrice + commission
                : 0
              : 0;
            const effectiveCloseNetReturnPct = effectiveCloseNetReturn / cashEquivalent;
            const dteCurrent = calcDteCurrent(expiry, NOW);
            const return30DPctResidual = calcReturnPctForPeriod(
              effectiveCloseNetReturnPct,
              dteCurrent,
              30
            );

            const status = current ? (strike > current ? 'Assignable' : undefined) : undefined;

            const cashEquivalentGBP = cashEquivalent / forexRate;
            const priceIncreaseGBP = priceIncrease / forexRate;
            const returnGBP = current && effectiveNetReturn / forexRate;
            const differenceGBP = current && difference / forexRate;

            const position = getPosition(positions, ticker, expiry, strike, type);
            const marketPrice = position?.mktPrice;
            const optionReturnPct = marketPrice ? 1 - marketPrice / tradePrice : undefined;
            const returnPctResidualEstimate = marketPrice
              ? Math.max(quantity * (optionSize * marketPrice + commission), 0) / cashEquivalent
              : undefined;
            const return30DPctResidualEstimate = returnPctResidualEstimate
              ? calcReturnPctForPeriod(returnPctResidualEstimate, dteCurrent, 30)
              : undefined;

            const row: PutRow = {
              account,
              assignmentPct: current ? strike / current - 1 : undefined,
              cashEquivalentGBP,
              closeTradePrice: (
                <CloseTradePriceInput
                  batchId={batchId}
                  closeTradePrices={closeTradePrices}
                  setCloseTradePrices={setCloseTradePrices}
                />
              ),
              current,
              date,
              daysToEarnings,
              differenceGBP,
              dteCurrent,
              dteTotal,
              expiry,
              high,
              highPct: current ? high / current - 1 : undefined,
              low,
              lowPct: low / current - 1,
              marketPrice,
              optionReturnPct,
              priceIncreaseGBP,
              quantity,
              return30DPctExpected,
              return30DPctEffective,
              return30DPctResidual,
              return30DPctResidualEstimate,
              returnGBP,
              status,
              stockPrice,
              strike,
              ticker,
              tradePrice,
            };

            totals.cashEquivalentGBP.value += cashEquivalentGBP;
            totals.returnGBP.value += returnGBP;
            totals.differenceGBP.value += differenceGBP;
            if (status === 'Assignable') {
              totals.status.value += quantity / countOfTrades;
            }

            return (
              <tr key={tradeIndex}>
                {orderedRowValues.map(
                  ({ name, format = (v: string | number) => v, align = 'right' }, index) => {
                    const showZeroValues =
                      name === 'assignmentPct' ||
                      name === 'dteCurrent' ||
                      name === 'highPct' ||
                      name === 'lowPct' ||
                      name === 'daysToEarnings' ||
                      name === 'return30DPctResidualEstimate';

                    const earningsConfirmed = earnings[ticker]?.confirmed;
                    const daysToEarningsClass = categoriseEarnings(
                      earningsDate,
                      expiry,
                      NOW,
                      earningsConfirmed
                    );

                    return (
                      <td
                        className={cx({
                          [styles[align]]: align === 'right',
                          [colour]: name === 'ticker',
                          [accountColour]: name === 'account',
                          [styles.contrast]: tradeIndex % 2 && index > 1,
                          [styles.freezeFirstTdColumn]: index === 0,
                          [styles.freezeSecondTdColumn]: index === 1,
                          mute:
                            name === 'return30DPctResidualEstimate' &&
                            typeof row?.[name] !== undefined &&
                            // Using the non-null assertion operator because
                            // TypeScript infers that `row.return30DPctResidualEstimate` may be `undefined` otherwise
                            row.return30DPctResidualEstimate! > MINIMUM_RETURN_THRESHOLD,
                          [styles[daysToEarningsClass]]: name === 'daysToEarnings',
                        })}
                        key={index}
                      >
                        {(!!row[name] || showZeroValues) && format(row[name])}
                      </td>
                    );
                  }
                )}
              </tr>
            );
          })}
          <tr>
            {headings.map(
              ({ name, format = (v: string | number) => v, align = 'right' }, index) => {
                const total = name in totals && totals[name as keyof typeof totals];
                return (
                  <td
                    className={cx(styles.total, {
                      [styles[align]]: align === 'right',
                    })}
                    key={index}
                  >
                    {total && total.value ? (total.format || format)(total.value) : false}
                  </td>
                );
              }
            )}
          </tr>
        </tbody>
      </table>
    </>
  );
};

export default Put;
