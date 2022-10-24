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
        <th>Ticker</th>
        <th>Earnings date</th>
        <th>Days to earnings</th>
        <th>Timing</th>
      </tr>
    </thead>
    <tbody>
      {Object.entries(data)
        .sort(([tickerA], [tickerB]) => tickerA.localeCompare(tickerB))
        .filter(([, { date }]) => dayjs(date, INPUT_DATE_FORMAT).isSameOrAfter(now, 'day'))
        .map(([ticker, { date, confirmed, timing }]) => (
          <tr key={ticker}>
            <td className={tickers[ticker].colour}>{ticker}</td>
            <td style={{ color: !confirmed ? 'Gainsboro' : 'inherit' }}>{date}</td>
            <td style={{ color: !confirmed ? 'Gainsboro' : 'inherit' }} className={styles.right}>
              {dayjs(date, INPUT_DATE_FORMAT).add(1, 'day').diff(now, 'day')}
            </td>
            <td>{timing}</td>
          </tr>
        ))}
    </tbody>
  </table>
);

export default UpcomingEarnings;
