import cx from 'classnames';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import cloneDeep from 'lodash.clonedeep';
import Head from 'next/head';
dayjs.extend(customParseFormat);
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
dayjs.extend(isSameOrAfter);

import { useEffect, useState } from 'react';

import Loading from '../components/Loading';
import { INPUT_DATE_FORMAT } from '../constants';
import accounts from '../data/accounts';
// @ts-ignore
import tradesData from '../data/options.csv';
import tickers, { tickersMap } from '../data/tickers';
import styles from '../styles/Table.module.css';
import { AccountName, ForexRates, HistoricalForexRates, TradeData } from '../types';
import { removeNullValues } from '../utils';
import { dateMediumTerm, thousands } from '../utils/format';

const MONTHS_TO_DISPLAY = 10;

const Income = () => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [rates, setRates] = useState<ForexRates | null>(null);
  const [historicalForexRates, setHistoricalForexRates] = useState<HistoricalForexRates | null>(
    null
  );

  useEffect(() => {
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

  if (isLoading) return <Loading />;
  if (!rates) return <p>Data missing.</p>;

  const trades: TradeData[] = tradesData
    .map(removeNullValues)
    .filter(({ date }: { date: string }) => dayjs(date, INPUT_DATE_FORMAT).isSameOrAfter(start));

  const accountsWithCurrencies: {
    [key: string]: { currencies: string[] };
  } = { ...accounts, All: { currencies: [] } };

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
    const { account, commission, date, ticker, tradePrice, type } = trade;
    const tradeMonth = dateMediumTerm(dayjs(date, INPUT_DATE_FORMAT));
    const { currency, optionSize } = tickers[tickersMap[ticker] ?? ticker];
    const { currencies } = accountsWithCurrencies[account];
    if (!currencies.includes(currency)) {
      currencies.push(currency);
    }
    if (!optionSize) {
      throw new Error(`Option size missing for ${ticker}`);
    }
    const gain = tradePrice * optionSize + commission;
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

    // Total of all accounts
    income[tradeMonth].All = income[tradeMonth].All || {};
    income[tradeMonth].All.BASE = income[tradeMonth].All.BASE || {
      Put: 0,
      Call: 0,
      Total: 0,
    };
    income[tradeMonth].All.BASE[type] =
      income[tradeMonth].All.BASE[type] +
      gain / (historicalForexRates?.[date]?.[currency] || rates[currency]);

    income[tradeMonth].All.BASE = income[tradeMonth].All.BASE || {
      Put: 0,
      Call: 0,
      Total: 0,
    };
    income[tradeMonth].All.BASE.Total =
      income[tradeMonth].All.BASE.Total +
      gain / (historicalForexRates?.[date]?.[currency] || rates[currency]);
  }

  for (const account in accountsWithCurrencies) {
    if (!accountsWithCurrencies[account].currencies.includes('BASE')) {
      accountsWithCurrencies[account].currencies.push('BASE');
    }
  }

  type IncomeBoolean = {
    Put: boolean;
    Call: boolean;
    Total: boolean;
  };

  const hasIncome: {
    // account
    [key: string]: {
      // currency
      [key: string]: IncomeBoolean;
    };
  } = Object.fromEntries(
    Object.entries(accountsWithCurrencies).map(([account, { currencies }]) => [
      account,
      Object.fromEntries(
        currencies.reduce((summary: [string, IncomeBoolean][], currency) => {
          const hasValue = (key: keyof Income) =>
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
        Object.entries(types).forEach(([type, amount]: [string, number]) => {
          summary[account][currencyCode][type as keyof Income] += amount;
        });
      });
      return summary;
    }, cloneDeep(accountsIncomeSkeleton));

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
              .filter(
                ([name, accountIncome]) => name === 'All' || Object.values(accountIncome).length > 1
              )
              .map(([account]) => {
                const colSpan = Object.values(hasIncome[account]).reduce(
                  (columns, incomes) => (columns += Object.values(incomes).filter(Boolean).length),
                  0
                );
                return (
                  <th
                    colSpan={colSpan}
                    className={accounts[account as AccountName]?.colour}
                    key={account}
                  >
                    {account}
                  </th>
                );
              })}
          </tr>
          <tr>
            {Object.entries(hasIncome)
              .filter(
                ([name, accountIncome]) => name === 'All' || Object.values(accountIncome).length > 1
              )
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
                    .map(([type]: [string, boolean], index, source) => (
                      <td
                        className={cx(styles.right, {
                          [styles.contrast]: rowIndex % 2,
                          [styles.leftEdge]: index === 0,
                          [styles.rightEdge]: index === source.length - 1,
                          [styles.thick]: type === 'Total' && currency === 'BASE',
                          [styles.italic]: !historicalForexRates,
                        })}
                        key={`${month}-${account}-${currency}-${type}`}
                      >
                        {thousands(
                          income[month]?.[account]?.[currency]?.[type as keyof Income] || 0
                        )}
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
                  .map(([type]: [string, boolean], index, source) => (
                    <td
                      className={cx(styles.total, styles.right, {
                        [styles.leftEdge]: index === 0,
                        [styles.rightEdge]: index === source.length - 1,
                        [styles.thick]: type === 'Total' && currency === 'BASE',
                        [styles.italic]: !historicalForexRates,
                      })}
                      key={`${account}-${currency}-${type}`}
                    >
                      {thousands(total[account][currency][type as keyof Income] || 0)}
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
