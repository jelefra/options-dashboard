import { createClient } from 'redis';
import { GetServerSideProps } from 'next';
import cx from 'classnames';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
dayjs.extend(isSameOrAfter);
import customParseFormat from 'dayjs/plugin/customParseFormat';
dayjs.extend(customParseFormat);

// @ts-ignore
import trades from '../data/options.csv';
import tickers from '../data/tickers';
import accounts from '../data/accounts';

import get from '../utils/get';
import fetchPutTickerPrices from '../utils/fetchPutTickerPrices';
import getForexRates from '../utils/getForexRates';
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
  calcStockPricePct,
  convertToGBP,
  getPutStatus,
  isCurrentPut,
} from '../utils';

import { INPUT_DATE_FORMAT, DISPLAY, ONE_HOUR_IN_SECONDS } from '../constants';
import { PutRow, PutRowTotal, TradeData } from '../types';

import styles from '../styles/Table.module.css';

const NOW = dayjs();

export const getServerSideProps: GetServerSideProps = async () => {
  const client = createClient();
  await client.connect();
  const currentTickerPrices = await get({
    client,
    fetchFn: fetchPutTickerPrices,
    keyName: 'putTickerPrices',
    now: NOW,
  });
  const rates = await get({
    client,
    fetchFn: getForexRates,
    keyName: 'rates',
    expiry: ONE_HOUR_IN_SECONDS,
  });

  return {
    props: { trades, currentTickerPrices, rates },
  };
};

const Put = ({
  trades,
  currentTickerPrices,
  rates,
}: {
  trades: TradeData[];
  currentTickerPrices: { [key: string]: number };
  rates: { [key: string]: number };
}) => {
  const headings: { name: keyof PutRow; format?: Function; align?: string }[] = [
    { name: 'account' },
    { name: 'ticker' },
    { name: 'date', format: dateShortTerm },
    { name: 'expiry', format: dateShortTerm },
    { name: 'dteTotal', align: 'right' },
    { name: 'dteCurrent', align: 'right' },
    { name: 'tradePrice', format: decimalTwo, align: 'right' },
    { name: 'stockPrice', format: decimalTwo, align: 'right' },
    { name: 'strike', format: decimalTwo, align: 'right' },
    { name: 'current', format: decimalTwo, align: 'right' },
    { name: 'status' },
    { name: 'low', format: decimalTwo, align: 'right' },
    { name: 'lowPct', format: pctOne, align: 'right' },
    { name: 'assignmentPct', format: pctOne, align: 'right' },
    { name: 'high', format: decimalTwo, align: 'right' },
    { name: 'highPct', format: pctOne, align: 'right' },
    { name: 'priceIncreaseGBP', format: thousands, align: 'right' },
    { name: 'return30DPct', format: pctOne, align: 'right' },
    {
      name: 'cashEquivalentGBP',
      format: thousands,
      align: 'right',
    },
    { name: 'returnGBP', format: thousands, align: 'right' },
    { name: 'differenceGBP', format: thousands, align: 'right' },
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
            <th className={cx(styles.th, styles.stickyTh)} key={index}>
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
              highPct: calcStockPricePct(high, current),
              low,
              lowPct: calcStockPricePct(low, current),
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
                {orderedRowValues.map(({ name, format = (v) => v, align }, index) => {
                  const showZeroValues =
                    name === 'assignmentPct' ||
                    name === 'dteCurrent' ||
                    name === 'highPct' ||
                    name === 'lowPct';

                  return (
                    <td
                      className={cx(styles.td, styles.border, {
                        [styles[align]]: !!align,
                        [colour]: name === 'ticker',
                        [accountColour]: name === 'account',
                        [styles.contrast]: tradeIndex % 2 && index > 1,
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
          {headings.map(({ name, format, align }, index) => (
            <td
              className={cx(styles.td, {
                [styles[align]]: !!align,
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
