import cx from 'classnames';
import dayjs, { Dayjs } from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
dayjs.extend(isSameOrAfter);
import customParseFormat from 'dayjs/plugin/customParseFormat';
dayjs.extend(customParseFormat);

import type { EarningsDates } from '../types';

import { INPUT_DATE_FORMAT } from '../constants';

import tickers from '../data/tickers';

import styles from '../styles/Table.module.css';

const UpcomingEarnings = ({ data, now }: { data: EarningsDates; now: Dayjs }) => (
  <table className={styles.table}>
    <thead>
      <tr>
        <th className={styles.th}>Ticker</th>
        <th className={styles.th}>Earnings date</th>
        <th className={styles.th}>Days to earnings</th>
      </tr>
    </thead>
    <tbody>
      {Object.entries(data)
        .sort(([tickerA], [tickerB]) => tickerA.localeCompare(tickerB))
        .filter(([, date]) => dayjs(date, INPUT_DATE_FORMAT).isSameOrAfter(now, 'day'))
        .map(([ticker, date]) => (
          <tr key={ticker}>
            <td className={cx(tickers[ticker].colour, styles.td, styles.border)}>{ticker}</td>
            <td className={cx(styles.td, styles.border)}>{date}</td>
            <td className={cx(styles.td, styles.border, styles.right)}>
              {dayjs(date, INPUT_DATE_FORMAT).add(1, 'day').diff(now, 'day')}
            </td>
          </tr>
        ))}
    </tbody>
  </table>
);

export default UpcomingEarnings;
