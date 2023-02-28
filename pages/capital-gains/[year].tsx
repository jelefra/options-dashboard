import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import cx from 'classnames';
import cloneDeep from 'lodash.clonedeep';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
dayjs.extend(customParseFormat);
import minMax from 'dayjs/plugin/minMax';
dayjs.extend(minMax);

import { dateMediumTerm, thousands } from '../../utils/format';
import { removeNullValues } from '../../utils';
import { factorStockSplit } from '../../utils/factorStockSplit';

import { DISPLAY, INPUT_DATE_FORMAT } from '../../constants';
import { Account, ForexRates, HistoricalForexRates, TradeData, TransactionData } from '../../types';

// @ts-ignore
import tradesData from '../../data/options.csv';
// @ts-ignore
import transactionsData from '../../data/transactions.csv';
import tickers from '../../data/tickers';
import accounts from '../../data/accounts';

import styles from '../../styles/Table.module.css';

const CapitalGains = () => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [rates, setRates] = useState<ForexRates>(null);
  const [historicalForexRates, setHistoricalForexRates] = useState<HistoricalForexRates>(null);

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

  const applicableAccounts: {
    [key: string]: Account;
  } = Object.fromEntries(Object.entries(accounts).filter(([, { capitalGains }]) => capitalGains));

  const transactions: TransactionData[] = transactionsData
    .map(removeNullValues)
    .filter(({ account }) => applicableAccounts[account]);
  const trades: TradeData[] = tradesData
    .map(removeNullValues)
    .filter(({ account }) => applicableAccounts[account]);

  useEffect(() => {
    setIsLoading(true);
    const fetchForexRatesHistorical = async () => {
      const response = await fetch('/api/forexRatesHistorical');
      const data = await response.json();
      setHistoricalForexRates(data.historicalRates);
    };
    fetchForexRatesHistorical().catch(console.error);
    setIsLoading(false);
  }, []);

  const { year } = useRouter().query;

  if (!year || isLoading) return <p>Loading</p>;

  if (typeof year === 'string' && isNaN(Number(year))) {
    return <p>Invalid URL</p>;
  }

  if (!rates) return <p>Data missing.</p>;

  const accountsWithCurrencies: {
    [key: string]: Account;
  } = [...transactions, ...trades].reduce((accounts, { account, ticker }) => {
    const accountTickers = accounts[account].tickers;
    if (!accountTickers.includes(ticker)) {
      accountTickers.push(ticker);

      const accountCurrencies = accounts[account].currencies;
      const tickerCurrency = tickers[ticker].currency;
      if (!accountCurrencies.includes(tickerCurrency)) {
        accountCurrencies.push(tickerCurrency);
      }
    }
    return accounts;
  }, cloneDeep(applicableAccounts));

  const stocks: {
    // account
    [key: string]: {
      // ticker
      [key: string]: {
        ticker: string;
        quantity: number;
        acquisitionCost: number;
      };
    };
  } = Object.fromEntries(
    Object.entries(accountsWithCurrencies).map(([account, { tickers }]) => [
      account,
      Object.fromEntries(
        tickers.map((ticker) => [ticker, { ticker, quantity: 0, acquisitionCost: 0 }])
      ),
    ])
  );

  const dateFirstTrade = dayjs(trades[0].date, INPUT_DATE_FORMAT);
  const dateFirstTransaction = dayjs(transactions[0].date, INPUT_DATE_FORMAT);
  const dateFirstOperation = dayjs.min(dateFirstTrade, dateFirstTransaction);

  const now = dayjs();
  const numberOfMonths = now.diff(dateFirstOperation, 'month');
  const months = [...Array(numberOfMonths + 1).keys()].map((n) =>
    dateMediumTerm(dayjs(dateFirstOperation).add(n, 'month'))
  );

  const financialYearStartDay = dayjs(`06/04/${Number(year) - 1}`, INPUT_DATE_FORMAT);
  const financialYearMonths = [...Array(13).keys()].map((n) =>
    dateMediumTerm(dayjs(financialYearStartDay).add(n, 'month'))
  );

  type CapitalGains = {
    put: number;
    call: number;
    ITMCall: number;
    sale: number;
    total: number;
  };

  type AccountsCapitalGains = {
    // account
    [key: string]: {
      // currency
      [key: string]: {
        gains: CapitalGains;
        losses: CapitalGains;
      };
    };
  };

  for (const account in accountsWithCurrencies) {
    accountsWithCurrencies[account].currencies.push('BASE');
  }

  const accountsCapitalGainsSkeleton: AccountsCapitalGains = Object.fromEntries(
    Object.entries(accountsWithCurrencies).map(([account, { currencies }]) => [
      account,
      Object.fromEntries(
        currencies.map((currency) => [
          currency,
          {
            gains: { put: 0, call: 0, ITMCall: 0, sale: 0, total: 0 },
            losses: { put: 0, call: 0, ITMCall: 0, sale: 0, total: 0 },
          },
        ])
      ),
    ])
  );

  const capitalGains: {
    // tradeMonth
    [key: string]: AccountsCapitalGains;
  } = Object.fromEntries(months.map((month) => [month, cloneDeep(accountsCapitalGainsSkeleton)]));

  for (let transaction of transactions) {
    const { account, commission, date, quantity, stockPrice, ticker, type } = transaction;

    if (type === 'Purchase') {
      const { currency } = tickers[ticker];
      stocks[account][ticker].acquisitionCost +=
        quantity * stockPrice + commission * historicalForexRates?.[date]?.[currency];
      stocks[account][ticker].quantity += factorStockSplit(
        ticker,
        quantity,
        dayjs(date, INPUT_DATE_FORMAT)
      );
    }
  }

  for (let trade of trades) {
    const {
      account,
      closeCommission = 0,
      closePrice,
      closeTradePrice = 0,
      commission,
      date,
      strike,
      ticker,
      tradePrice,
      type,
    } = trade;

    if (type === 'Put') {
      const { currency, optionSize } = tickers[ticker];
      const tradeMonth = dateMediumTerm(dayjs(date, INPUT_DATE_FORMAT));

      const gain = tradePrice * optionSize - commission * historicalForexRates?.[date]?.[currency];
      capitalGains[tradeMonth][account][currency].gains.put += gain;
      capitalGains[tradeMonth][account][currency].gains.total += gain;
      capitalGains[tradeMonth][account].BASE.gains.total +=
        gain / historicalForexRates?.[date]?.[currency];

      const costToClose =
        closeTradePrice * optionSize + closeCommission * historicalForexRates?.[date]?.[currency];
      capitalGains[tradeMonth][account][currency].losses.put -= costToClose;
      capitalGains[tradeMonth][account][currency].losses.total -= costToClose;
      capitalGains[tradeMonth][account].BASE.losses.total -=
        costToClose / historicalForexRates?.[date]?.[currency];

      if (closePrice && closePrice < strike) {
        stocks[account][ticker].acquisitionCost +=
          strike * optionSize + commission * historicalForexRates?.[date]?.[currency];
        stocks[account][ticker].quantity += factorStockSplit(
          ticker,
          optionSize,
          dayjs(date, INPUT_DATE_FORMAT)
        );
      }
    }
  }

  for (let transaction of transactions) {
    const { account, commission, date, quantity, stockPrice, ticker, type } = transaction;

    if (type === 'Sale') {
      const { currency } = tickers[ticker];
      const tradeMonth = dateMediumTerm(dayjs(date, INPUT_DATE_FORMAT));
      const saleAmount =
        quantity * stockPrice - commission * historicalForexRates?.[date]?.[currency];
      const stock = stocks[account][ticker];
      const acquisitionCost = (stock.acquisitionCost / stock.quantity) * quantity;
      const gain = saleAmount - acquisitionCost;

      if (gain > 0) {
        capitalGains[tradeMonth][account][currency].gains.sale += gain;
        capitalGains[tradeMonth][account][currency].gains.total += gain;
        capitalGains[tradeMonth][account].BASE.gains.total +=
          gain / historicalForexRates?.[date]?.[currency];
      } else {
        capitalGains[tradeMonth][account][currency].losses.sale += gain;
        capitalGains[tradeMonth][account][currency].losses.total += gain;
        capitalGains[tradeMonth][account].BASE.losses.total +=
          gain / historicalForexRates?.[date]?.[currency];
      }

      stock.acquisitionCost -= stockPrice * quantity;
      stock.quantity -= quantity;
    }
  }

  for (let trade of trades) {
    const {
      account,
      closeCommission = 0,
      closePrice,
      closeTradePrice = 0,
      commission,
      date,
      strike,
      ticker,
      tradePrice,
      type,
    } = trade;

    const { currency, optionSize } = tickers[ticker];
    const tradeMonth = dateMediumTerm(dayjs(date, INPUT_DATE_FORMAT));

    const gain = tradePrice * optionSize - commission * historicalForexRates?.[date]?.[currency];
    const costToClose =
      closeTradePrice * optionSize + closeCommission * historicalForexRates?.[date]?.[currency];
    const key = capitalGains[tradeMonth][account];

    if (type === 'Call') {
      key[currency].gains.call += gain;
      key[currency].gains.total += gain;
      key.BASE.gains.total += gain / historicalForexRates?.[date]?.[currency];
      key[currency].losses.call -= costToClose;
      key[currency].losses.total -= costToClose;
      key.BASE.losses.total -= costToClose / historicalForexRates?.[date]?.[currency];
    }

    if (type === 'Call' && closePrice > strike) {
      const acquisitionCost =
        (stocks[account][ticker].acquisitionCost / stocks[account][ticker].quantity) * optionSize;
      if (
        acquisitionCost <
        strike * optionSize + commission * historicalForexRates?.[date]?.[currency]
      ) {
        key[currency].gains.ITMCall += strike * optionSize - acquisitionCost;
        key[currency].gains.total += strike * optionSize - acquisitionCost;
        key.BASE.gains.total +=
          (strike * optionSize - acquisitionCost) / historicalForexRates?.[date]?.[currency];
      } else {
        key[currency].losses.ITMCall += strike * optionSize - acquisitionCost;
        key[currency].losses.total += strike * optionSize - acquisitionCost;
        key.BASE.losses.total +=
          (strike * optionSize - acquisitionCost) / historicalForexRates?.[date]?.[currency];
      }

      stocks[account][ticker].acquisitionCost -= strike * optionSize;
      stocks[account][ticker].quantity -= optionSize;
    }
  }

  const hasGains: {
    // account
    [key: string]: {
      // currency
      [key: string]: {
        put: boolean;
        call: boolean;
        ITMCallGain: boolean;
        ITMCallLoss: boolean;
        saleGain: boolean;
        saleLoss: boolean;
        total: boolean;
      };
    };
  } = Object.fromEntries(
    Object.entries(accountsWithCurrencies).map(([account, { currencies }]) => [
      account,
      Object.fromEntries(
        currencies.reduce((currenciesCapitalGains, currency) => {
          const hasValue = (key) =>
            Object.values(capitalGains).some(
              (gains) =>
                gains[account][currency].gains[key] !== 0 ||
                gains[account][currency].losses[key] !== 0
            );
          return hasValue('total')
            ? [
                ...currenciesCapitalGains,
                [
                  currency,
                  {
                    put: hasValue('put'),
                    call: hasValue('call'),
                    ITMCall: hasValue('ITMCall'),
                    sale: hasValue('sale'),
                    total: hasValue('total'),
                  },
                ],
              ]
            : currenciesCapitalGains;
        }, [])
      ),
    ])
  );

  const total = Object.entries(capitalGains)
    .filter(([month]) => financialYearMonths.includes(month))
    .flatMap(([, gains]) => Object.entries(gains))
    .reduce((summary, [account, currencies]) => {
      Object.entries(currencies).forEach(([currencyCode, types]) => {
        Object.entries(types).forEach(([type, categories]) => {
          for (const category in categories) {
            summary[account][currencyCode][type][category] += categories[category];
          }
        });
      });
      return summary;
    }, cloneDeep(accountsCapitalGainsSkeleton));

  const displayTotal = (
    { key1, key2 }: { key1: string; key2?: string },
    className: string = undefined
  ) => {
    return Object.entries(hasGains).map(([account, currenciesCapitalGains]) =>
      Object.entries(currenciesCapitalGains).map(([currency, currencyCapitalGains]) =>
        Object.entries(currencyCapitalGains)
          .filter(([, value]) => value)
          .map(([id], index, source) => (
            <td
              className={cx(className, styles.total, styles.right, {
                [styles.leftEdge]: index === 0,
                [styles.rightEdge]: index === source.length - 1,
                [styles.thick]: currency === 'BASE',
              })}
              key={`${account}-${currency}-${id}`}
            >
              {thousands(
                (total[account][currency][key1][id] || 0) +
                  (total[account][currency][key2]?.[id] || 0)
              )}
            </td>
          ))
      )
    );
  };

  return (
    <>
      <Head>
        <title>Capital gains</title>
        <link rel="icon" href="/capital-gains.ico" />
      </Head>
      <table className={styles.table}>
        <thead>
          <tr>
            <th rowSpan={3}>Month</th>
            {Object.entries(hasGains).map(([account, currenciesCapitalGains]) => {
              const colSpan = Object.values(currenciesCapitalGains)
                .flat()
                .reduce(
                  (count, currencyCapitalGains) =>
                    count + Object.values(currencyCapitalGains).filter(Boolean).length,
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
            {Object.entries(hasGains).map(([account, currenciesCapitalGains]) =>
              Object.entries(currenciesCapitalGains).map(([currency, currencyCapitalGains]) => (
                <th
                  colSpan={Object.values(currencyCapitalGains).filter(Boolean).length}
                  className={cx(styles.leftEdge, styles.rightEdge)}
                  key={`${account}-${currency}`}
                >
                  {currency}
                </th>
              ))
            )}
          </tr>
          <tr>
            {Object.entries(hasGains).map(([account, currenciesCapitalGains]) =>
              Object.entries(currenciesCapitalGains).map(([currency, currencyCapitalGains]) =>
                Object.entries(currencyCapitalGains)
                  .filter(([, value]) => value)
                  .map(([id], index, source) => (
                    <th
                      className={cx({
                        [styles.leftEdge]: index === 0,
                        [styles.rightEdge]: index === source.length - 1,
                      })}
                      key={`${account}-${currency}-${id}`}
                    >
                      {DISPLAY[id] || id}
                    </th>
                  ))
              )
            )}
          </tr>
        </thead>
        <tbody>
          {financialYearMonths.map((month, rowIndex) => (
            <tr className={cx(styles.row, { [styles.contrast]: rowIndex % 2 })} key={month}>
              <td>{month}</td>
              {Object.entries(hasGains).map(([account, currenciesCapitalGains]) =>
                Object.entries(currenciesCapitalGains).map(([currency, currencyCapitalGains]) =>
                  Object.entries(currencyCapitalGains)
                    .filter(([, value]) => value)
                    .map(([id], index, source) => (
                      <td
                        className={cx(styles.right, styles.columnWidthSm, {
                          [styles.leftEdge]: index === 0,
                          [styles.rightEdge]: index === source.length - 1,
                          [styles.thick]: currency === 'BASE',
                        })}
                        key={`${account}-${currency}-${id}`}
                      >
                        {thousands(
                          (capitalGains[month]?.[account]?.[currency]?.gains[id] || 0) +
                            (capitalGains[month]?.[account]?.[currency]?.losses[id] || 0)
                        )}
                      </td>
                    ))
                )
              )}
            </tr>
          ))}
          <tr>
            <td className={styles.total}>
              <strong>Gains</strong>
            </td>
            {displayTotal({ key1: 'gains' })}
          </tr>
          <tr>
            <td className={styles.total}>
              <strong>Losses</strong>
            </td>
            {displayTotal({ key1: 'losses' }, 'mute')}
          </tr>
          <tr>
            <td className={styles.total}>
              <strong>Total</strong>
            </td>
            {displayTotal({ key1: 'gains', key2: 'losses' }, 'mute')}
          </tr>
        </tbody>
      </table>
    </>
  );
};

export default CapitalGains;
