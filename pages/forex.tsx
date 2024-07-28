import cx from 'classnames';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import Head from 'next/head';
import { useEffect, useState } from 'react';
dayjs.extend(customParseFormat);

import Loading from '../components/Loading';
import { DISPLAY, INPUT_DATE_FORMAT } from '../constants';
import accounts from '../data/accounts';
// @ts-ignore
import forexData from '../data/forex.csv';
import styles from '../styles/Table.module.css';
import { ForexData, ForexRates, ForexRow } from '../types';
import { dateLongTerm, decimalTwo, pctOne, thousands } from '../utils/format';

const Forex = () => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [rates, setRates] = useState<ForexRates | null>(null);

  useEffect(() => {
    const fetchForexRates = async () => {
      const response = await fetch('/api/forexRates');
      const data = await response.json();
      setRates(data.rates);
      setIsLoading(false);
    };
    fetchForexRates().catch(console.error);
  }, []);

  if (isLoading) return <Loading />;
  if (!rates) return <p>Data missing.</p>;

  const forex: ForexData[] = forexData;

  const headings: { name: keyof ForexRow; format?: Function; align?: 'right' }[] = [
    { name: 'date', format: dateLongTerm },
    { name: 'account' },
    { name: 'currencyPair' },
    { name: 'quantity', format: thousands, align: 'right' },
    { name: 'rate', format: decimalTwo, align: 'right' },
    { name: 'currentRate', format: decimalTwo },
    { name: 'differencePct', format: pctOne, align: 'right' },
    { name: 'profitGBP', format: thousands, align: 'right' },
  ];

  return (
    <>
      <Head>
        <title>Forex</title>
        <link rel="icon" href="/forex.ico" />
      </Head>
      <table className={styles.table}>
        <thead>
          <tr>
            {headings.map(({ name }, index) => (
              <th key={index}>{DISPLAY[name] || name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {forex.map(({ date, account, quantity, commission, currencyPair, rate }, rowIndex) => {
            const [currencySold, currencyBought] = currencyPair.split('.');
            const currentRate = rates[currencyBought] / rates[currencySold];
            const profitAndLoss = quantity * (currentRate - rate);

            const row: ForexRow = {
              date: dayjs(date, INPUT_DATE_FORMAT),
              account,
              quantity,
              rate,
              currencyPair,
              currentRate,
              profitGBP: profitAndLoss / rates[currencyBought] + commission,
              differencePct: rate / currentRate - 1,
            };
            const accountColour = accounts[account].colour;

            return (
              <tr key={rowIndex}>
                {headings.map(({ name, format = (v: number) => v, align = '' }, index) => (
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
    </>
  );
};

export default Forex;
