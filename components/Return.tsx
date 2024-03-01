import cx from 'classnames';
import dayjs, { Dayjs } from 'dayjs';
import minMax from 'dayjs/plugin/minMax';
dayjs.extend(minMax);
import { useState } from 'react';

import { INPUT_DATE_FORMAT } from '../constants';
// @ts-ignore
import accountValuesData from '../data/account-values.csv';
import accounts from '../data/accounts';
import { accountNames } from '../data/accounts';
// @ts-ignore
import bankData from '../data/bank.csv';
import buttonStyles from '../styles/Button.module.css';
import tableStyles from '../styles/Table.module.css';
import { AccountName, BankData } from '../types';
import { pctOne, thousands } from '../utils/format';

// eslint-disable-next-line no-unused-vars
type AccountValue = { month: string } & { [key in AccountName]: number };
type AccountData = {
  start: number;
  deposits: number;
  withdrawals: number;
  end: number;
};
type TimeFrame = { start: Dayjs; duration: number; id: string; count: number };

const ACCOUNT_VALUES: AccountValue[] = accountValuesData;
const BANK: BankData[] = bankData;

const getAggregateData = (accountDataDictionary: { [key: string]: AccountData }[]): AccountData =>
  accountDataDictionary.reduce(
    (summary: AccountData, accountDataObject) => {
      Object.entries(Object.values(accountDataObject)[0]).forEach(([key, value]) => {
        summary[key as keyof AccountData] += value;
      });
      return summary;
    },
    { start: 0, deposits: 0, withdrawals: 0, end: 0 }
  );

const getOperationsInTimeFrame = (effectiveStartDate: Dayjs, effectiveEndDate: Dayjs) =>
  BANK.filter(
    (operation) =>
      dayjs(operation.date, INPUT_DATE_FORMAT).isSameOrAfter(effectiveStartDate) &&
      dayjs(operation.date, INPUT_DATE_FORMAT).isBefore(effectiveEndDate)
  );

const getEffectiveDates = (lastLoggedDate: Dayjs, timeFrame: TimeFrame) => {
  const firstLoggedDate = dayjs(ACCOUNT_VALUES[0].month, INPUT_DATE_FORMAT);
  const endDate = timeFrame.start.add(timeFrame.duration, 'months');

  // TODO Remove type casting (unexpectedly required after migrating from Yarn to npm)
  return {
    effectiveStartDate: dayjs.max([firstLoggedDate, timeFrame.start]) as Dayjs,
    effectiveEndDate: dayjs.min([lastLoggedDate, endDate]) as Dayjs,
  };
};

const getAccountDataDictionary = (
  lastLoggedDate: Dayjs,
  timeFrame: TimeFrame
): { [key: string]: AccountData }[] => {
  const { effectiveStartDate, effectiveEndDate } = getEffectiveDates(lastLoggedDate, timeFrame);
  const operationsInTimeFrame = getOperationsInTimeFrame(effectiveStartDate, effectiveEndDate);
  const startRow = findRow(effectiveStartDate, ACCOUNT_VALUES);
  const endRow = findRow(effectiveEndDate, ACCOUNT_VALUES);

  if (!startRow || !endRow) {
    throw new Error('Missing account values');
  }

  // eslint-disable-next-line no-unused-vars
  const accountDataDictionarySkeleton: { [key in AccountName]: AccountData }[] = accountNames.map(
    (account) => {
      const start = startRow[account];
      const end = endRow[account];
      return { [account]: { start, end, deposits: 0, withdrawals: 0 } } as {
        // eslint-disable-next-line no-unused-vars
        [key in AccountName]: AccountData;
      };
    }
  );

  return operationsInTimeFrame.reduce((summary, { account, type, amount }) => {
    const accountObject = summary.find((accountObject) => accountObject[account]);
    if (!accountObject) {
      throw new Error(`Account not found: ${account}`);
    }
    if (type === 'Deposit') {
      accountObject[account].deposits += amount;
    }
    if (type === 'Withdrawal') {
      accountObject[account].withdrawals += amount;
    }
    return summary;
  }, accountDataDictionarySkeleton);
};

const getYearsTimeFrames = (): TimeFrame[] => {
  const years = ACCOUNT_VALUES.reduce(
    (years: { [key: number]: { year: number; count: number } }, cv) => {
      const year = dayjs(cv.month, INPUT_DATE_FORMAT).year();
      years[year] = { year, count: (years[year]?.count ?? 0) + 1 };
      return years;
    },
    {}
  );

  return Object.values(years).map(({ year, count }) => ({
    start: dayjs(`${year}-01-01`),
    duration: 12,
    count,
    id: String(year),
  }));
};

const findRow = (date: Dayjs, data: AccountValue[]) =>
  data.find((row) => row.month === date.format(INPUT_DATE_FORMAT));

const getMonthsTimeFrames = (lastLoggedDate: Dayjs): TimeFrame[] =>
  [12, 10, 6, 3]
    .map((months) => ({
      start: lastLoggedDate.subtract(months, 'month'),
      duration: months,
      count: 12,
      id: `${months}M`,
    }))
    .filter((monthTimeFrame) => findRow(monthTimeFrame.start, ACCOUNT_VALUES));

const getTimeFrames = (lastLoggedDate: Dayjs): TimeFrame[] => {
  const monthsTimeFrames = getMonthsTimeFrames(lastLoggedDate);
  const yearsTimeFrames = getYearsTimeFrames();
  return [...yearsTimeFrames, ...monthsTimeFrames];
};

const Return = () => {
  const lastLoggedDate = dayjs(ACCOUNT_VALUES.slice(-1)[0].month, INPUT_DATE_FORMAT);
  const timeFrames = getTimeFrames(lastLoggedDate);

  const [timeFrame, setTimeFrame] = useState<TimeFrame>(timeFrames.slice(-1)[0]);

  const accountDataDictionary = getAccountDataDictionary(lastLoggedDate, timeFrame);
  const aggregateData = getAggregateData(accountDataDictionary);

  return (
    <div>
      {timeFrames.map(({ start, count, duration, id }, index) => {
        const current = id === timeFrame.id;

        return (
          <button
            className={cx(buttonStyles.button, buttonStyles.primary, {
              [buttonStyles.disabled]: current,
            })}
            onClick={!current ? () => setTimeFrame({ start, duration, id, count }) : undefined}
            key={id}
          >
            {count === 12 ? id : `${id} (${count - (index === 0 ? 0 : 1)}m)`}
          </button>
        );
      })}
      <table className={tableStyles.table}>
        <thead>
          <tr>
            <th />
            {['Start value', 'Deposits', 'Withdrawals', 'Net', 'End value', 'Change', 'Return'].map(
              (heading, index) => (
                <th key={index} className={tableStyles.columnWidthLg}>
                  {heading}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody>
          {[...accountDataDictionary, { Total: aggregateData }].map((row, index) => {
            const [account, { start, deposits, withdrawals, end }] = Object.entries(row)[0];
            // Rough estimates
            const returnEstimates = [
              (end + withdrawals) / (start + deposits) - 1, // deposits at start, withdrawals at end
              (end - deposits) / (start - withdrawals) - 1, // deposits at end, withdrawals at start
              (end - deposits + withdrawals) / start - 1, // deposits at end, withdrawals at end
              end / (start + deposits - withdrawals) - 1, // deposits at start, withdrawals at start
            ];
            const returnMin = Math.min(...returnEstimates);
            const returnMax = Math.max(...returnEstimates);
            const returnDisplayed =
              returnMin === returnMax
                ? pctOne(end / start - 1)
                : `${pctOne(returnMin)} to ${pctOne(returnMax)}`;

            const net = deposits - withdrawals;
            const change = end - start;

            return (
              <tr key={index}>
                <td className={(accounts[account as AccountName] || {}).colour}>{account}</td>
                <td className={tableStyles.right}>{thousands(start)}</td>
                <td className={tableStyles.right}>{thousands(deposits)}</td>
                <td className={tableStyles.right}>{thousands(withdrawals)}</td>
                <td className={tableStyles.right}>{thousands(net)}</td>
                <td className={tableStyles.right}>{thousands(end)}</td>
                <td className={tableStyles.right}>{thousands(change)}</td>
                <td className={tableStyles.right}>{returnDisplayed}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default Return;
