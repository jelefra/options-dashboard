import Head from 'next/head';
import cx from 'classnames';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
dayjs.extend(customParseFormat);

import processData from '../utils/processData';
import { dateMediumTerm, thousands } from '../utils/format';
import { removeNullValues } from '../utils';
import { factorStockSplit } from '../utils/factorStockSplit';

import { INPUT_DATE_FORMAT } from '../constants';
import { Account, Stock, TradeData, TransactionData } from '../types';

// @ts-ignore
import tradesData from '../data/options.csv';
// @ts-ignore
import transactionsData from '../data/transactions.csv';
import tickers from '../data/tickers';
import accounts from '../data/accounts';

import styles from '../styles/Table.module.css';

const CapitalGains = () => {
  const transactions: TransactionData[] = transactionsData.map(removeNullValues);
  const trades: TradeData[] = tradesData.map(removeNullValues);

  const { batches } = processData({ transactions, trades });

  const accountsWithCurrencies: {
    [key: string]: Account;
  } = { ...accounts };
  const gains = {};

  for (let trade of trades) {
    const {
      account,
      batchCode,
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
    if (!accountsWithCurrencies[account].capitalGains) {
      continue;
    }
    const tradeMonth = dateMediumTerm(dayjs(date, INPUT_DATE_FORMAT));
    const { currency, optionSize } = tickers[ticker];
    const { currencies } = accountsWithCurrencies[account];
    if (!currencies.includes(currency)) {
      currencies.push(currency);
    }
    const gain = (tradePrice - closeTradePrice) * optionSize - (commission + closeCommission);
    gains[tradeMonth] = gains[tradeMonth] || {};
    gains[tradeMonth][account] = gains[tradeMonth][account] || {};
    gains[tradeMonth][account][currency] = gains[tradeMonth][account][currency] || {};
    gains[tradeMonth][account][currency].gain =
      (gains[tradeMonth][account][currency].gain || 0) + gain;

    if (type === 'Call' && closePrice > strike) {
      const { acquisitionCost } = batches[batchCode];
      gains[tradeMonth][account][currency].gain += strike * optionSize - acquisitionCost;
    }
  }

  const stocks: {
    [key: string]: {
      [key: string]: Stock;
    };
  } = {};
  for (let transaction of transactions) {
    const {
      account,
      batchCodes: batchCodesStr,
      commission,
      date,
      quantity,
      stockPrice,
      ticker,
      type,
    } = transaction;

    const { colour, currency } = tickers[ticker];
    stocks[account] = stocks[account] || {};
    stocks[account][ticker] = stocks[account][ticker] || {
      colour,
      currency,
      ticker,
    };

    if (type === 'Purchase') {
      if (batchCodesStr) {
        // TODO
        // ...
      } else {
        stocks[account][ticker].partialBatch = stocks[account][ticker].partialBatch || {
          acquisitionCost: 0,
          quantity: 0,
        };
        const partialBatch = stocks[account][ticker].partialBatch;
        partialBatch.acquisitionCost += quantity * stockPrice + commission;
        partialBatch.quantity += factorStockSplit(ticker, quantity, dayjs(date, INPUT_DATE_FORMAT));
      }
    }

    if (type === 'Sale') {
      if (batchCodesStr) {
        // TODO
        // ...
      } else {
        const tradeMonth = dateMediumTerm(dayjs(date, INPUT_DATE_FORMAT));

        const saleAmount = quantity * stockPrice - commission;
        const partialBatch = stocks[account][ticker].partialBatch;
        const acquisitionCost = (partialBatch.acquisitionCost / partialBatch.quantity) * quantity;
        const gain = saleAmount - acquisitionCost;

        gains[tradeMonth] = gains[tradeMonth] || {};
        gains[tradeMonth][account] = gains[tradeMonth][account] || {};
        gains[tradeMonth][account][currency] = gains[tradeMonth][account][currency] || {};
        gains[tradeMonth][account][currency].gain =
          (gains[tradeMonth][account][currency].gain || 0) + gain;

        partialBatch.acquisitionCost -= stockPrice * quantity + commission;
        partialBatch.quantity -= factorStockSplit(ticker, quantity, dayjs(date, INPUT_DATE_FORMAT));
      }
    }
  }

  const accountsInfo = Object.values(accountsWithCurrencies).filter(
    ({ capitalGains }) => capitalGains
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
            <th rowSpan={2}>Month</th>
            {accountsInfo.map(({ name, currencies, colour }) => (
              <th colSpan={currencies.length} className={colour} key={name}>
                {name}
              </th>
            ))}
          </tr>
          <tr>
            {accountsInfo.map(({ name, currencies }) =>
              currencies.map((currency) => (
                <th className={styles.columnWidth65} key={`${name}-${currency}`}>
                  {currency}
                </th>
              ))
            )}
          </tr>
        </thead>
        <tbody>
          {Object.entries(gains).map(([month, accountData], rowIndex) => (
            <tr className={cx({ [styles.contrast]: rowIndex % 2 })} key={month}>
              <td>{month}</td>
              {accountsInfo.map(({ name, currencies }) =>
                currencies.map((currency) => (
                  <td
                    className={cx(styles.right, {
                      [styles.contrast]: rowIndex % 2,
                    })}
                    key={`${month}-${name}-${currency}`}
                  >
                    {thousands(accountData[name]?.[currency]?.gain || 0)}
                  </td>
                ))
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
};

export default CapitalGains;
