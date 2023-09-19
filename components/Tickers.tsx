import dayjs, { Dayjs } from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
dayjs.extend(isSameOrAfter);
import customParseFormat from 'dayjs/plugin/customParseFormat';
dayjs.extend(customParseFormat);
import cx from 'classnames';
import cloneDeep from 'lodash.clonedeep';

import { INPUT_DATE_FORMAT } from '../constants';
import tickers from '../data/tickers';
import styles from '../styles/Table.module.css';
import type { EarningsDates, TradeData, TransactionData } from '../types';
import { hoursToDays } from '../utils/format';

type BatchCodesType = { [key: string]: { ticker: string; batchCode: string } };

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
  const transactionsBatchNames: BatchCodesType = transactions.reduce(
    (names, { ticker, batchCodes }) =>
      batchCodes
        ? { ...names, [ticker]: { ticker, batchCode: batchCodes.split(',').pop() } }
        : names,
    {}
  );

  const batchCodes = trades.reduce((names, { ticker, batchCode }) => {
    if (batchCode) {
      if (!names[ticker]) {
        names[ticker] = { ticker, batchCode };
      } else {
        const [, index] = batchCode.match(/(\d+)/);
        const [, overallIndex] = names[ticker].batchCode.match(/(\d+)/);
        if (index > overallIndex) {
          names[ticker].batchCode = `${ticker}${index}`;
        }
      }
    }
    return names;
  }, cloneDeep(transactionsBatchNames) as BatchCodesType);

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
                <td className={tickers[ticker].colour}>{ticker}</td>
                <td>{batchCodes[ticker]?.batchCode}</td>
                <td className={cx({ mute })}>{date}</td>
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
