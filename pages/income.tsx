import Head from 'next/head';
import cx from 'classnames';
import cloneDeep from 'lodash.clonedeep';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
dayjs.extend(customParseFormat);
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
dayjs.extend(isSameOrAfter);

import { dateMediumTerm, thousands } from '../utils/format';
import { removeNullValues } from '../utils';

import { INPUT_DATE_FORMAT } from '../constants';
import { Account, ForexRates, HistoricalForexRates, TradeData } from '../types';

// @ts-ignore
import tradesData from '../data/options.csv';
import tickers from '../data/tickers';
import accounts from '../data/accounts';

import styles from '../styles/Table.module.css';
import { useEffect, useState } from 'react';

const MONTHS_TO_DISPLAY = 10;

const Income = () => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [rates, setRates] = useState<ForexRates>(null);
  const [historicalForexRates, setHistoricalForexRates] = useState<HistoricalForexRates>(null);

  useEffect(() => {
    setIsLoading(true);
    const fetchForexRates = async () => {
      const response = await fetch('/api/forexRates');
      const data = await response.json();
      setRates(data.rates);
      setIsLoading(false);
    };
    fetchForexRates().catch(console.error);
  }, []);

  const start = dayjs()
    .date(1)
    .subtract(MONTHS_TO_DISPLAY - 1, 'months');

  const from = start.format(INPUT_DATE_FORMAT);

  useEffect(() => {
    const fetchForexRatesHistorical = async () => {
      const response = await fetch(`/api/forexRatesHistorical?from=${from}`);
      const data = await response.json();
      setHistoricalForexRates(data.historicalRates);
    };
    fetchForexRatesHistorical().catch(console.error);
  }, [from]);

  if (isLoading) return <p>Loading</p>;
  if (!rates) return <p>Data missing.</p>;

  const trades: TradeData[] = tradesData
    .map(removeNullValues)
    .filter(({ date }) => dayjs(date, INPUT_DATE_FORMAT).isSameOrAfter(start));

  const accountsWithCurrencies: {
    [key: string]: Account;
  } = { ...accounts };

  type Income = {
    Put: number;
    Call: number;
    Total: number;
  };

  type AccountsIncome = {
    // account
    [key: string]: {
      // currency
      [key: string]: Income;
    };
  };

  const income: {
    // month
    [key: string]: AccountsIncome;
  } = {};

  for (let trade of trades) {
    const {
      account,
      closeCommission = 0,
      closeTradePrice = 0,
      commission,
      date,
      ticker,
      tradePrice,
      type,
    } = trade;
    const tradeMonth = dateMediumTerm(dayjs(date, INPUT_DATE_FORMAT));
    const { currency, optionSize } = tickers[ticker];
    const { currencies } = accountsWithCurrencies[account];
    if (!currencies.includes(currency)) {
      currencies.push(currency);
    }
    const gain = (tradePrice - closeTradePrice) * optionSize - (commission + closeCommission);
    income[tradeMonth] = income[tradeMonth] || {};
    income[tradeMonth][account] = income[tradeMonth][account] || {};
    income[tradeMonth][account][currency] = income[tradeMonth][account][currency] || {
      Put: 0,
      Call: 0,
      Total: 0,
    };
    income[tradeMonth][account][currency][type] =
      income[tradeMonth][account][currency][type] + gain;
    income[tradeMonth][account][currency].Total =
      income[tradeMonth][account][currency].Total + gain;

    income[tradeMonth][account].BASE = income[tradeMonth][account].BASE || {
      Put: 0,
      Call: 0,
      Total: 0,
    };
    income[tradeMonth][account].BASE.Total =
      income[tradeMonth][account].BASE.Total +
      gain / (historicalForexRates?.[date]?.[currency] || rates[currency]);
  }

  for (const account in accountsWithCurrencies) {
    accountsWithCurrencies[account].currencies.push('BASE');
  }

  const hasIncome: {
    // account
    [key: string]: {
      // currency
      [key: string]: {
        Put: boolean;
        Call: boolean;
        Total: boolean;
      };
    };
  } = Object.fromEntries(
    Object.entries(accountsWithCurrencies).map(([account, { currencies }]) => [
      account,
      Object.fromEntries(
        currencies.reduce((summary, currency) => {
          const hasValue = (key) =>
            Object.values(income).some((entry) => (entry[account]?.[currency]?.[key] || 0) !== 0);
          return [
            ...summary,
            [currency, { Put: hasValue('Put'), Call: hasValue('Call'), Total: hasValue('Total') }],
          ];
        }, [])
      ),
    ])
  );

  const accountsIncomeSkeleton: AccountsIncome = Object.fromEntries(
    Object.entries(accountsWithCurrencies).map(([account, { currencies }]) => [
      account,
      Object.fromEntries(
        currencies.map((currency) => [
          currency,
          {
            Put: 0,
            Call: 0,
            Total: 0,
          },
        ])
      ),
    ])
  );

  const total = Object.entries(income)
    .flatMap(([, accountsIncome]) => Object.entries(accountsIncome))
    .reduce((summary, [account, currencies]) => {
      Object.entries(currencies).forEach(([currencyCode, types]) => {
        Object.entries(types).forEach(([type, amount]) => {
          summary[account][currencyCode][type] += amount;
        });
      });
      return summary;
    }, cloneDeep(accountsIncomeSkeleton));

  console.log(hasIncome, Object.entries(hasIncome));

  return (
    <>
      <Head>
        <title>Income</title>
        <link rel="icon" href="/income.ico" />
      </Head>
      <table className={styles.table}>
        <thead>
          <tr>
            <th rowSpan={3}>Month</th>
            {Object.entries(hasIncome)
              .filter(([, accountIncome]) => Object.values(accountIncome).length > 1)
              .map(([account]) => {
                const colSpan = Object.values(hasIncome[account]).reduce(
                  (columns, incomes) => (columns += Object.values(incomes).filter(Boolean).length),
                  0
                );
                return (
                  <th colSpan={colSpan} className={accounts[account].colour} key={account}>
                    {account}
                  </th>
                );
              })}
          </tr>
          <tr>
            {Object.entries(hasIncome)
              .filter(([, accountIncome]) => Object.values(accountIncome).length > 1)
              .map(([name, currencies]) =>
                Object.keys(currencies).map((currency) => {
                  const colSpan = Object.values(hasIncome[name][currency]).filter(Boolean).length;
                  return (
                    <th
                      colSpan={colSpan}
                      className={styles.columnWidthMd}
                      key={`${name}-${currency}`}
                    >
                      {currency}
                    </th>
                  );
                })
              )}
          </tr>
          <tr>
            {Object.entries(hasIncome).map(([name, currencies]) =>
              Object.keys(currencies).map((currency) => {
                const types = Object.entries(hasIncome[name][currency])
                  .filter(([, has]) => has)
                  .map(([type]) => type);
                return types.map((type) => (
                  <th className={styles.columnWidthMd} key={`${name}-${currency}-${type}`}>
                    {type}
                  </th>
                ));
              })
            )}
          </tr>
        </thead>
        <tbody>
          {Object.entries(income).map(([month], rowIndex) => (
            <tr className={cx({ [styles.contrast]: rowIndex % 2 })} key={month}>
              <td>{month}</td>
              {Object.entries(hasIncome).map(([account, currencies]) =>
                Object.entries(currencies).map(([currency, incomes]) =>
                  Object.entries(incomes)
                    .filter(([, value]) => value)
                    .map(([type], index, source) => (
                      <td
                        className={cx(styles.right, {
                          [styles.contrast]: rowIndex % 2,
                          [styles.leftEdge]: index === 0,
                          [styles.rightEdge]: index === source.length - 1,
                          [styles.thick]: currency === 'BASE',
                          [styles.italic]: !historicalForexRates,
                        })}
                        key={`${month}-${account}-${currency}-${type}`}
                      >
                        {thousands(income[month]?.[account]?.[currency]?.[type] || 0)}
                      </td>
                    ))
                )
              )}
            </tr>
          ))}
          <tr className={styles.topEdge}>
            <td className={styles.total}>
              <strong>Total</strong>
            </td>
            {Object.entries(hasIncome).map(([account, currencies]) =>
              Object.entries(currencies).map(([currency, incomes]) =>
                Object.entries(incomes)
                  .filter(([, value]) => value)
                  .map(([id], index, source) => (
                    <td
                      className={cx(styles.total, styles.right, {
                        [styles.leftEdge]: index === 0,
                        [styles.rightEdge]: index === source.length - 1,
                        [styles.thick]: currency === 'BASE',
                        [styles.italic]: !historicalForexRates,
                      })}
                      key={`${account}-${currency}-${id}`}
                    >
                      {thousands(total[account][currency][id] || 0)}
                    </td>
                  ))
              )
            )}
          </tr>
        </tbody>
      </table>
    </>
  );
};

export default Income;
