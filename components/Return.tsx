import dayjs, { Dayjs } from 'dayjs';

import { INPUT_DATE_FORMAT } from '../constants';
// @ts-ignore
import accountValuesData from '../data/account-values.csv';
import accounts from '../data/accounts';
// @ts-ignore
import bankData from '../data/bank.csv';
import styles from '../styles/Table.module.css';
import { BankData } from '../types';
import { pctOne, thousands } from '../utils/format';

type AccountValue = { month: string } & { [key: string]: number };

type AccountData = { start: number; deposits: number; withdrawals: number; end: number };

const findRow = (date: Dayjs, data: AccountValue[]) =>
  data.find((row) => row.month === date.format(INPUT_DATE_FORMAT));

const Return = () => {
  const accountNames = Object.keys(accounts);
  const accountsValues: AccountValue[] = accountValuesData;

  const startDate = dayjs('2023-01-01');
  const endDate = startDate.add(1, 'year');
  const startRow = findRow(startDate, accountsValues);
  const endRow = findRow(endDate, accountsValues);

  const bank: BankData[] = bankData;
  const operationsInTimeframe = bank.filter(
    (operation) =>
      dayjs(operation.date, INPUT_DATE_FORMAT).isSameOrAfter(startDate) &&
      dayjs(operation.date, INPUT_DATE_FORMAT).isBefore(endDate)
  );

  const accountDataDictionary = accountNames.map((account) => {
    const start = startRow?.[account] || 0;
    const end = endRow?.[account] || 0;

    const { deposits, withdrawals } = operationsInTimeframe.reduce(
      (summary, operation) => {
        if (operation.account === account && operation.type === 'Deposit') {
          summary.deposits += operation.amount;
        }
        if (operation.account === account && operation.type === 'Withdrawal') {
          summary.withdrawals += operation.amount;
        }
        return summary;
      },
      { deposits: 0, withdrawals: 0 }
    );

    return { [account]: { start, deposits, withdrawals, end } };
  });

  const aggregateData = accountDataDictionary.reduce(
    (summary: AccountData, cv) => {
      Object.entries(Object.values(cv)[0]).forEach(([key, value]) => {
        summary[key as keyof AccountData] += value;
      });
      return summary;
    },
    { start: 0, deposits: 0, withdrawals: 0, end: 0 }
  );

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Account</th>
          <th>Start value</th>
          <th>Deposits</th>
          <th>Withdrawals</th>
          <th>End value</th>
          <th>Return</th>
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

          return (
            <tr key={index}>
              <td className={(accounts[account] || {}).colour}>{account}</td>
              <td className={styles.right}>{thousands(start)}</td>
              <td className={styles.right}>{thousands(deposits)}</td>
              <td className={styles.right}>{thousands(withdrawals)}</td>
              <td className={styles.right}>{thousands(end)}</td>
              <td className={styles.right}>{returnDisplayed}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

export default Return;
