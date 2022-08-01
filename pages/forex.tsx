import { createClient } from 'redis';
import cx from 'classnames';
import dayjs from 'dayjs';
import { GetServerSideProps } from 'next';
import customParseFormat from 'dayjs/plugin/customParseFormat';
dayjs.extend(customParseFormat);

// @ts-ignore
import bank from '../data/bank.csv';
import accounts from '../data/accounts';

import get from '../utils/get';
import getForexRates from '../utils/getForexRates';
import { decimalTwo, dateLongTerm, pctOne, thousands } from '../utils/format';
import { convertToGBP } from '../utils';

import { DISPLAY, INPUT_DATE_FORMAT, ONE_HOUR_IN_SECONDS } from '../constants';
import { BankData, ForexRow } from '../types';

import styles from '../styles/Table.module.css';

export const getServerSideProps: GetServerSideProps = async () => {
  const client = createClient();
  await client.connect();
  const rates = await get({
    client,
    fetchFn: getForexRates,
    keyName: 'rates',
    expiry: ONE_HOUR_IN_SECONDS,
  });
  return { props: { bank, rates } };
};

const Forex = ({ bank, rates }: { bank: BankData[]; rates: { [key: string]: number } }) => {
  const headings: { name: keyof ForexRow; format?: Function; align?: string }[] = [
    { name: 'date', format: dateLongTerm },
    { name: 'account' },
    { name: 'amount', format: thousands, align: 'right' },
    { name: 'currencyPair' },
    { name: 'rate', format: decimalTwo, align: 'right' },
    { name: 'currentRate', format: decimalTwo },
    { name: 'differencePct', format: pctOne, align: 'right' },
    { name: 'profitGBP', format: thousands, align: 'right' },
  ];

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          {headings.map(({ name }, index) => (
            <th className={styles.th} key={index}>
              {DISPLAY[name] || name}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {bank
          .filter(({ type }) => type === 'Conversion')
          .map(({ date, account, amount, commission, currencyPair, rate }, rowIndex) => {
            const [currencySold, currencyBought] = currencyPair.split('/');
            const currentRate = rates[currencyBought] / rates[currencySold];
            const profitAndLoss = amount * (rate - currentRate);

            const row: ForexRow = {
              date: dayjs(date, INPUT_DATE_FORMAT),
              account,
              amount,
              rate,
              currencyPair,
              currentRate,
              profitGBP: convertToGBP(profitAndLoss, rates[currencyBought]) - commission,
              differencePct: rate / currentRate - 1,
            };
            const accountColour = accounts[account].colour;

            return (
              <tr key={rowIndex}>
                {headings.map(({ name, format = (v) => v, align }, index) => (
                  <td
                    className={cx(styles.td, styles.border, {
                      [styles[align]]: !!align,
                      [accountColour]: name === 'account',
                      [styles.contrast]: rowIndex % 2 && index !== 1,
                    })}
                    key={index}
                  >
                    {row[name] !== undefined && format(row[name])}
                  </td>
                ))}
              </tr>
            );
          })}
      </tbody>
    </table>
  );
};

export default Forex;
