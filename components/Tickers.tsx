import dayjs, { Dayjs } from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
dayjs.extend(isSameOrAfter);
import customParseFormat from 'dayjs/plugin/customParseFormat';
dayjs.extend(customParseFormat);
import cx from 'classnames';
import cloneDeep from 'lodash.clonedeep';

import { DATE_LONG_HORIZON, INPUT_DATE_FORMAT } from '../constants';
import tickers, { tickersMap } from '../data/tickers';
import styles from '../styles/Table.module.css';
import type { EarningsDates, TradeData, TransactionData } from '../types';
import { hoursToDays } from '../utils/format';

type BatchCodes = { [key: string]: { ticker: string; batchCode: string } };

const Tickers = ({
  earnings,
  now,
  trades,
  transactions,
}: {
  earnings: EarningsDates;
  now: Dayjs;
  trades: TradeData[];
  transactions: TransactionData[];
}) => {
  const transactionsBatchNames: BatchCodes = transactions.reduce(
    (names, { ticker, batchCodes }) =>
      batchCodes
        ? { ...names, [ticker]: { ticker, batchCode: batchCodes.split(',').pop() } }
        : names,
    {}
  );

  const batchCodes = trades.reduce((latestBatchCodes, { ticker, batchCode }) => {
    if (batchCode) {
      if (!latestBatchCodes[ticker]) {
        latestBatchCodes[ticker] = { ticker, batchCode };
      } else {
        const batchCodeMatch = batchCode.match(/(\d+)/);
        if (!batchCodeMatch) {
          throw new Error(`Batch code missing an id ${batchCode}`);
        }
        const [, index] = batchCodeMatch;
        const latestBatchCodeMatch = latestBatchCodes[ticker].batchCode.match(/(\d+)/);
        if (!latestBatchCodeMatch) {
          throw new Error(`Latest batch code missing an id ${latestBatchCodes[ticker].batchCode}`);
        }
        const [, overallIndex] = latestBatchCodeMatch;
        if (index > overallIndex) {
          latestBatchCodes[ticker].batchCode = `${ticker}${index}`;
        }
      }
    }
    return latestBatchCodes;
  }, cloneDeep(transactionsBatchNames) as BatchCodes);

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Ticker</th>
          <th>Batch code</th>
          <th>Earnings date</th>
          <th>Days to earnings</th>
          <th>Timing</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(earnings)
          .sort(([tickerA], [tickerB]) => tickerA.localeCompare(tickerB))
          .map(([ticker, { date, confirmed, timing }]) => {
            const daysToEarnings = hoursToDays(
              dayjs(date, INPUT_DATE_FORMAT).add(1, 'day').diff(now, 'hour')
            );
            const mute = !confirmed || daysToEarnings < 0;

            return (
              <tr key={ticker}>
                <td className={tickers[tickersMap[ticker] ?? ticker].colour}>{ticker}</td>
                <td>{batchCodes[ticker]?.batchCode}</td>
                <td className={cx({ mute })}>{date.format(DATE_LONG_HORIZON)}</td>
                <td className={cx(styles.right, { mute })}>{daysToEarnings}</td>
                <td>{!mute ? timing : ''}</td>
              </tr>
            );
          })}
      </tbody>
    </table>
  );
};

export default Tickers;
