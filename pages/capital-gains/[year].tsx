import cx from 'classnames';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import cloneDeep from 'lodash.clonedeep';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
dayjs.extend(customParseFormat);
import minMax from 'dayjs/plugin/minMax';
dayjs.extend(minMax);

import Loading from '../../components/Loading';
import { DISPLAY, INPUT_DATE_FORMAT } from '../../constants';
import accounts from '../../data/accounts';
// @ts-ignore
import tradesData from '../../data/options.csv';
import tickers from '../../data/tickers';
// @ts-ignore
import transactionsData from '../../data/transactions.csv';
import styles from '../../styles/Table.module.css';
import { Account, ForexRates, HistoricalForexRates, TradeData, TransactionData } from '../../types';
import { removeNullValues } from '../../utils';
import { factorStockSplit } from '../../utils/factorStockSplit';
import { dateMediumTerm, thousands } from '../../utils/format';

const CapitalGains = () => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [rates, setRates] = useState<ForexRates>(null);
  const [historicalForexRates, setHistoricalForexRates] = useState<HistoricalForexRates>(null);

  useEffect(() => {
    const fetchForexRates = async () => {
      const response = await fetch('/api/forexRates');
      const data = await response.json();
      setRates(data.rates);
      setIsLoading(false);
    };
    fetchForexRates().catch(console.error);
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
      setIsLoading(false);
    };
    fetchForexRatesHistorical().catch(console.error);
  }, []);

  const { year } = useRouter().query;

  if (!year || isLoading) return <Loading />;

  if (typeof year === 'string' && isNaN(Number(year))) {
    return <p>Invalid URL</p>;
  }

  if (!rates && !historicalForexRates) return <p>Data missing.</p>;

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
  const months = [...Array(numberOfMonths + 2).keys()].map((n) =>
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
      const forexRate = historicalForexRates?.[date]?.[currency] || rates[currency];
      stocks[account][ticker].acquisitionCost += quantity * stockPrice + commission * forexRate;
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
      const forexRate = historicalForexRates?.[date]?.[currency] || rates[currency];

      const gain = tradePrice * optionSize - commission * forexRate;
      capitalGains[tradeMonth][account][currency].gains.put += gain;
      capitalGains[tradeMonth][account][currency].gains.total += gain;
      capitalGains[tradeMonth][account].BASE.gains.total += gain / forexRate;

      const costToClose = closeTradePrice * optionSize + closeCommission * forexRate;
      capitalGains[tradeMonth][account][currency].losses.put -= costToClose;
      capitalGains[tradeMonth][account][currency].losses.total -= costToClose;
      capitalGains[tradeMonth][account].BASE.losses.total -= costToClose / forexRate;

      if (closePrice && closePrice < strike) {
        stocks[account][ticker].acquisitionCost += strike * optionSize + commission * forexRate;
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
      const forexRate = historicalForexRates?.[date]?.[currency] || rates[currency];
      const saleAmount = quantity * stockPrice - commission * forexRate;
      const stock = stocks[account][ticker];
      const acquisitionCost = (stock.acquisitionCost / stock.quantity) * quantity;
      const gain = saleAmount - acquisitionCost;

      if (gain > 0) {
        capitalGains[tradeMonth][account][currency].gains.sale += gain;
        capitalGains[tradeMonth][account][currency].gains.total += gain;
        capitalGains[tradeMonth][account].BASE.gains.total += gain / forexRate;
      } else {
        capitalGains[tradeMonth][account][currency].losses.sale += gain;
        capitalGains[tradeMonth][account][currency].losses.total += gain;
        capitalGains[tradeMonth][account].BASE.losses.total += gain / forexRate;
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
    const forexRate = historicalForexRates?.[date]?.[currency] || rates[currency];

    const gain = tradePrice * optionSize - commission * forexRate;
    const costToClose = closeTradePrice * optionSize + closeCommission * forexRate;
    const key = capitalGains[tradeMonth][account];

    if (type === 'Call') {
      key[currency].gains.call += gain;
      key[currency].gains.total += gain;
      key.BASE.gains.total += gain / forexRate;
      key[currency].losses.call -= costToClose;
      key[currency].losses.total -= costToClose;
      key.BASE.losses.total -= costToClose / forexRate;
    }

    if (type === 'Call' && closePrice > strike) {
      const acquisitionCost =
        (stocks[account][ticker].acquisitionCost / stocks[account][ticker].quantity) * optionSize;
      if (acquisitionCost < strike * optionSize + commission * forexRate) {
        key[currency].gains.ITMCall += strike * optionSize - acquisitionCost;
        key[currency].gains.total += strike * optionSize - acquisitionCost;
        key.BASE.gains.total += (strike * optionSize - acquisitionCost) / forexRate;
      } else {
        key[currency].losses.ITMCall += strike * optionSize - acquisitionCost;
        key[currency].losses.total += strike * optionSize - acquisitionCost;
        key.BASE.losses.total += (strike * optionSize - acquisitionCost) / forexRate;
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
                [styles.italic]: !historicalForexRates,
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
                          [styles.italic]: !historicalForexRates,
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
          <tr className={styles.topEdge}>
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
