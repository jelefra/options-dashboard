import dayjs, { Dayjs } from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
dayjs.extend(isSameOrAfter);
import customParseFormat from 'dayjs/plugin/customParseFormat';
dayjs.extend(customParseFormat);

import type { EarningsDates } from '../types';

import { INPUT_DATE_FORMAT } from '../constants';

import tickers from '../data/tickers';

import styles from '../styles/Table.module.css';

const SHOW_PAST_DAYS = 30;

const Earnings = ({ data, now }: { data: EarningsDates; now: Dayjs }) => (
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
        .filter(([, { date }]) =>
          dayjs(date, INPUT_DATE_FORMAT).add(SHOW_PAST_DAYS, 'day').isSameOrAfter(now, 'day')
        )
        .map(([ticker, { date, confirmed, timing }]) => {
          const daysToEarnings = dayjs(date, INPUT_DATE_FORMAT).add(1, 'day').diff(now, 'day');
          const mute = !confirmed || daysToEarnings < 0;
          const style = { color: mute ? 'Gainsboro' : 'inherit' };

          return (
            <tr key={ticker}>
              <td className={tickers[ticker].colour}>{ticker}</td>
              <td style={style}>{date}</td>
              <td style={style} className={styles.right}>
                {daysToEarnings}
              </td>
              <td style={style}>{confirmed ? timing : ''}</td>
            </tr>
          );
        })}
    </tbody>
  </table>
);

export default Earnings;
