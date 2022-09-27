import React, { useEffect, useState } from 'react';
import cx from 'classnames';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
dayjs.extend(customParseFormat);

// @ts-ignore
import bankData from '../data/bank.csv';
import accounts from '../data/accounts';

import { decimalTwo, dateLongTerm, pctOne, thousands } from '../utils/format';

import { DISPLAY, INPUT_DATE_FORMAT } from '../constants';
import { BankData, ForexRow } from '../types';

import styles from '../styles/Table.module.css';

const Forex = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [rates, setRates] = useState<{ [key: string]: number }>(null);

  useEffect(() => {
    setIsLoading(true);
    const fetchForexRates = async () => {
      const response = await fetch('/api/forexRates');
      const data = await response.json();
      setRates(data.rates);
    };
    fetchForexRates().catch(console.error);
    setIsLoading(false);
  }, []);

  if (isLoading) return <p>Loading...</p>;
  if (!rates) return <p>Data missing.</p>;

  const bank: BankData[] = bankData;

  const headings: { name: keyof ForexRow; format?: Function; align?: 'right' }[] = [
    { name: 'date', format: dateLongTerm },
    { name: 'account' },
    { name: 'currencyPair' },
    { name: 'amount', format: thousands, align: 'right' },
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
            <th key={index}>{DISPLAY[name] || name}</th>
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
              profitGBP: profitAndLoss / rates[currencyBought] - commission,
              differencePct: rate / currentRate - 1,
            };
            const accountColour = accounts[account].colour;

            return (
              <tr key={rowIndex}>
                {headings.map(({ name, format = (v) => v, align }, index) => (
                  <td
                    className={cx({
                      [styles[align]]: align === 'right',
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
