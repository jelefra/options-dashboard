import Head from 'next/head';
import cx from 'classnames';
import cloneDeep from 'lodash.clonedeep';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
dayjs.extend(customParseFormat);
import minMax from 'dayjs/plugin/minMax';
dayjs.extend(minMax);

import { dateMediumTerm, thousands } from '../utils/format';
import { removeNullValues } from '../utils';
import { factorStockSplit } from '../utils/factorStockSplit';

import { DISPLAY, INPUT_DATE_FORMAT } from '../constants';
import { Account, TradeData, TransactionData } from '../types';

// @ts-ignore
import tradesData from '../data/options.csv';
// @ts-ignore
import transactionsData from '../data/transactions.csv';
import tickers from '../data/tickers';
import accounts from '../data/accounts';

import styles from '../styles/Table.module.css';

const CapitalGains = () => {
  const applicableAccounts: {
    [key: string]: Account;
  } = Object.fromEntries(Object.entries(accounts).filter(([, { capitalGains }]) => capitalGains));

  const transactions: TransactionData[] = transactionsData
    .map(removeNullValues)
    .filter(({ account }) => applicableAccounts[account]);
  const trades: TradeData[] = tradesData
    .map(removeNullValues)
    .filter(({ account }) => applicableAccounts[account]);

  const accountsData: {
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
    Object.entries(accountsData).map(([account, { tickers }]) => [
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
  const months = [...Array(numberOfMonths + 2).keys()].map((elem) =>
    dateMediumTerm(dayjs(dateFirstOperation).add(elem, 'month'))
  );

  type CapitalGains = {
    put: number;
    call: number;
    ITMCallGain: number;
    ITMCallLoss: number;
    saleGain: number;
    saleLoss: number;
    total: number;
  };

  type AccountsCapitalGains = {
    // account
    [key: string]: {
      // currency
      [key: string]: CapitalGains;
    };
  };

  const accountsCapitalGainsSkeleton: AccountsCapitalGains = Object.fromEntries(
    Object.entries(accountsData).map(([account, { currencies }]) => [
      account,
      Object.fromEntries(
        currencies.map((currency) => [
          currency,
          {
            put: 0,
            call: 0,
            ITMCallGain: 0,
            ITMCallLoss: 0,
            saleGain: 0,
            saleLoss: 0,
            total: 0,
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
      stocks[account][ticker].acquisitionCost += quantity * stockPrice + commission;
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
      const gain = (tradePrice - closeTradePrice) * optionSize - (commission + closeCommission);
      capitalGains[tradeMonth][account][currency].put += gain;

      if (closePrice && closePrice < strike) {
        stocks[account][ticker].acquisitionCost += strike * optionSize + commission;
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
      const saleAmount = quantity * stockPrice - commission;
      const stock = stocks[account][ticker];
      const acquisitionCost = (stock.acquisitionCost / stock.quantity) * quantity;
      const gain = saleAmount - acquisitionCost;

      if (gain > 0) {
        capitalGains[tradeMonth][account][currency].saleGain += gain;
      } else {
        capitalGains[tradeMonth][account][currency].saleLoss += gain;
      }
      capitalGains[tradeMonth][account][currency].total += gain;

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
    const gain = (tradePrice - closeTradePrice) * optionSize - (commission + closeCommission);

    if (type === 'Call') {
      capitalGains[tradeMonth][account][currency].call += gain;
    }
    capitalGains[tradeMonth][account][currency].total += gain;

    if (type === 'Call' && closePrice > strike) {
      const acquisitionCost =
        (stocks[account][ticker].acquisitionCost / stocks[account][ticker].quantity) * optionSize;
      if (acquisitionCost < strike * optionSize + commission) {
        capitalGains[tradeMonth][account][currency].ITMCallGain +=
          strike * optionSize - acquisitionCost;
      } else {
        capitalGains[tradeMonth][account][currency].ITMCallLoss +=
          strike * optionSize - acquisitionCost;
      }
      capitalGains[tradeMonth][account][currency].total += strike * optionSize - acquisitionCost;

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
    Object.entries(accountsData).map(([account, { currencies }]) => [
      account,
      Object.fromEntries(
        currencies.reduce((currenciesCapitalGains, currency) => {
          const hasValue = (key) =>
            Object.values(capitalGains).some((gains) => gains[account][currency][key] !== 0);
          return hasValue('total')
            ? [
                ...currenciesCapitalGains,
                [
                  currency,
                  {
                    put: hasValue('put'),
                    call: hasValue('call'),
                    ITMCallGain: hasValue('ITMCallGain'),
                    ITMCallLoss: hasValue('ITMCallLoss'),
                    saleGain: hasValue('saleGain'),
                    saleLoss: hasValue('saleLoss'),
                    total: hasValue('total'),
                  },
                ],
              ]
            : currenciesCapitalGains;
        }, [])
      ),
    ])
  );

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
          {months.map((month, rowIndex) => (
            <tr className={cx(styles.row, { [styles.contrast]: rowIndex % 2 })} key={month}>
              <td>{month}</td>
              {Object.entries(hasGains).map(([account, currenciesCapitalGains]) =>
                Object.entries(currenciesCapitalGains).map(([currency, currencyCapitalGains]) =>
                  Object.entries(currencyCapitalGains)
                    .filter(([, value]) => value)
                    .map(([id], index, source) => (
                      <td
                        className={cx(styles.right, {
                          [styles.leftEdge]: index === 0,
                          [styles.rightEdge]: index === source.length - 1,
                        })}
                        key={`${account}-${currency}-${id}`}
                      >
                        {thousands(capitalGains[month][account][currency][id]) || 0}
                      </td>
                    ))
                )
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
};

export default CapitalGains;
