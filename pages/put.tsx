import { useEffect, useState } from 'react';
import cx from 'classnames';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
dayjs.extend(isSameOrAfter);
import customParseFormat from 'dayjs/plugin/customParseFormat';
dayjs.extend(customParseFormat);

// @ts-ignore
import tradesData from '../data/options.csv';
import tickers from '../data/tickers';
import accounts from '../data/accounts';

import { dateShortTerm, decimalTwo, pctOne, pctZero, thousands } from '../utils/format';
import {
  calcAssignmentPct,
  calcCashEquivalent,
  calcDteCurrent,
  calcDteTotal,
  calcEffectiveNetReturnPct,
  calcNetReturn,
  calcPriceIncrease,
  calcPutDifference,
  calcPutEffectiveNetReturn,
  calcReturnPctForPeriod,
  calcStockPriceLow,
  calcStockPriceHigh,
  convertToGBP,
  getPutStatus,
  isCurrentPut,
  removeNullValues,
} from '../utils';

import { INPUT_DATE_FORMAT, DISPLAY } from '../constants';
import { PutRow, PutRowTotal, TradeData } from '../types';

import styles from '../styles/Table.module.css';

const NOW = dayjs();

const Put = () => {
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

    const fetchPutTickerPrices = async () => {
      const response = await fetch(`/api/putTickerPrices?now=${String(NOW)}`);
      const data = await response.json();
      setCurrentTickerPrices(data.currentTickerPrices);
    };
    fetchPutTickerPrices().catch(console.error);
    setIsLoading(false);
  }, []);

  if (isLoading) return <p>Loading...</p>;
  if (!rates || !currentTickerPrices) return <p>Data missing.</p>;

  const trades: TradeData[] = tradesData.map(removeNullValues);

  const headings: { name: keyof PutRow; format?: Function; align?: 'default' | 'right' }[] = [
    { name: 'account', align: 'default' },
    { name: 'ticker', align: 'default' },
    { name: 'date', format: dateShortTerm, align: 'default' },
    { name: 'expiry', format: dateShortTerm, align: 'default' },
    { name: 'dteTotal' },
    { name: 'dteCurrent' },
    { name: 'tradePrice', format: decimalTwo },
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
    { name: 'return30DPct', format: pctOne },
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
    <table className={styles.table}>
      <thead>
        <tr>
          {headings.map(({ name }, index) => (
            <th
              className={cx(styles.th, styles.white, styles.freezeFirstThRow, {
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
        {trades
          .filter((trade) => isCurrentPut(trade, NOW))
          .sort((a, b) => a.ticker.localeCompare(b.ticker))
          .sort((a, b) => a.account.localeCompare(b.account))
          .map((trade, tradeIndex) => {
            const orderedRowValues = headings.map((heading) => ({ ...heading }));

            const { account, ticker, tradePrice, strike, commission, stockPrice } = trade;
            const accountColour = accounts[account].colour;
            const { optionSize, currency, colour } = tickers[ticker];
            const current = currentTickerPrices[ticker];
            const forexRate = rates[currency];

            const date = dayjs(trade.date, INPUT_DATE_FORMAT);
            const expiry = dayjs(trade.expiry, INPUT_DATE_FORMAT);
            const dteTotal = calcDteTotal(expiry, date);
            const low = calcStockPriceLow(strike, tradePrice, commission, optionSize);
            const high = calcStockPriceHigh(stockPrice, tradePrice, commission, optionSize);
            const netReturn = calcNetReturn(optionSize, tradePrice, commission);
            const cashEquivalent = calcCashEquivalent(optionSize, strike);
            const priceIncrease = calcPriceIncrease(current, high, optionSize);
            const difference = calcPutDifference(strike, current, optionSize);
            const effectiveNetReturn = calcPutEffectiveNetReturn(netReturn, difference);
            const effectiveNetReturnPct = calcEffectiveNetReturnPct(
              effectiveNetReturn,
              cashEquivalent
            );
            const return30DPct = calcReturnPctForPeriod(effectiveNetReturnPct, dteTotal, 30);
            const status = getPutStatus(strike, current);

            const cashEquivalentGBP = convertToGBP(cashEquivalent, forexRate);
            const priceIncreaseGBP = convertToGBP(priceIncrease, forexRate);
            const returnGBP = convertToGBP(effectiveNetReturn, forexRate);
            const differenceGBP = convertToGBP(difference, forexRate);

            const row: PutRow = {
              account,
              assignmentPct: calcAssignmentPct(strike, current),
              cashEquivalentGBP,
              current,
              date,
              differenceGBP,
              dteCurrent: calcDteCurrent(expiry, NOW),
              dteTotal,
              expiry,
              high,
              highPct: high / current - 1,
              low,
              lowPct: low / current - 1,
              priceIncreaseGBP,
              return30DPct,
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
              totals.status.value += 1 / countOfTrades;
            }

            return (
              <tr key={tradeIndex}>
                {orderedRowValues.map(({ name, format = (v) => v, align = 'right' }, index) => {
                  const showZeroValues =
                    name === 'assignmentPct' ||
                    name === 'dteCurrent' ||
                    name === 'highPct' ||
                    name === 'lowPct';

                  return (
                    <td
                      className={cx(styles.td, styles.border, {
                        [styles[align]]: align === 'right',
                        [colour]: name === 'ticker',
                        [accountColour]: name === 'account',
                        [styles.contrast]: tradeIndex % 2 && index > 1,
                        [styles.freezeFirstTdColumn]: index === 0,
                        [styles.freezeSecondTdColumn]: index === 1,
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
          {headings.map(({ name, format, align = 'right' }, index) => (
            <td
              className={cx(styles.td, {
                [styles[align]]: align === 'right',
              })}
              key={index}
            >
              {totals[name]?.value && (totals[name].format || format)(totals[name].value)}
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  );
};

export default Put;
