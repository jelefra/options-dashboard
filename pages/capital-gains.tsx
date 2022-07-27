import { GetServerSideProps } from 'next';
import cx from 'classnames';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
dayjs.extend(isSameOrAfter);
import customParseFormat from 'dayjs/plugin/customParseFormat';
dayjs.extend(customParseFormat);
import { v4 as uuid } from 'uuid';

import { dateMediumTerm, thousands } from '../utils/format';

import { CSV_DATE_FORMAT } from '../constants';
import { Account, TradeData, TransactionData } from '../types';

// @ts-ignore
import tradesData from '../data/options.csv';
// @ts-ignore
import transactionsData from '../data/transactions.csv';
import tickers from '../data/tickers';
import accounts from '../data/accounts';

import styles from '../styles/Table.module.css';

const getPurchaseCostFromTransactions = (transactions: TransactionData[]) => {
  const batches: { [key: string]: { batchCode: string; netCost: number; quantity: number } } = {};

  for (let transaction of transactions) {
    const { batchCodes: batchCodesStr } = transaction;
    const { commission, quantity, stockPrice, type } = transaction;

    if (type === 'Purchase' && batchCodesStr) {
      const batchCodes = batchCodesStr.includes(',') ? batchCodesStr.split(',') : [batchCodesStr];

      for (let batchCode of batchCodes) {
        batches[batchCode] = batches[batchCode] || {
          batchCode,
          netCost: 0,
          quantity: 0,
        };

        const batch = batches[batchCode];

        const oldNetCost = batch.netCost;
        const oldQuantity = batch.quantity;

        batch.netCost =
          (oldQuantity * oldNetCost + quantity * stockPrice + commission) /
          (oldQuantity + quantity);
        batch.quantity += quantity / batchCodes.length;
      }
    }
  }

  return batches;
};

const getPurchaseCostFromTrades = (trades: TradeData[]) => {
  const batches = {};
  for (let trade of trades) {
    const { batchCode, closePrice, strike, type } = trade;

    if (type === 'Put' && closePrice && closePrice < strike) {
      batches[batchCode] = strike;
    }
  }
  return batches;
};

const getPurchaseCost = () => {
  const purchaseCostFromTransactions = getPurchaseCostFromTransactions(transactionsData);
  const purchaseCostFromTrades = getPurchaseCostFromTrades(tradesData);
  return { ...purchaseCostFromTrades, ...purchaseCostFromTransactions };
};

export const getServerSideProps: GetServerSideProps = async () => {
  const tradesTyped: TradeData[] = tradesData;

  const batches = getPurchaseCost();

  const accountsWithCurrencies: {
    [key: string]: Account;
  } = { ...accounts };
  const gains = {};

  for (let trade of tradesTyped) {
    const { account, batchCode, closePrice, date, strike, ticker, tradePrice, type } = trade;
    if (!accountsWithCurrencies[account].capitalGains) {
      continue;
    }
    const tradeMonth = dateMediumTerm(dayjs(date, CSV_DATE_FORMAT));
    const { currency, optionSize } = tickers[ticker];
    const { currencies } = accountsWithCurrencies[account];
    if (!currencies.includes(currency)) {
      currencies.push(currency);
    }
    const gain = tradePrice * optionSize;
    gains[tradeMonth] = gains[tradeMonth] || {};
    gains[tradeMonth][account] = gains[tradeMonth][account] || {};
    gains[tradeMonth][account][currency] = gains[tradeMonth][account][currency] || {};
    gains[tradeMonth][account][currency].gain =
      (gains[tradeMonth][account][currency].gain || 0) + gain;

    if (type === 'Call' && closePrice > strike) {
      const grossCost = batches[batchCode];
      gains[tradeMonth][account][currency].gain += (strike - grossCost) * optionSize;
    }
  }

  const accountsInfo = Object.values(accountsWithCurrencies).filter(
    ({ capitalGains }) => capitalGains
  );

  return {
    props: {
      gains,
      accountsInfo,
    },
  };
};

export default function CapitalGains({ gains, accountsInfo }) {
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th rowSpan={2} className={styles.th}>
            Month
          </th>
          {accountsInfo.map(({ name, currencies, colour }) => (
            <th colSpan={currencies.length} className={cx(styles.th, colour)} key={name}>
              {name}
            </th>
          ))}
        </tr>
        <tr>
          {accountsInfo.map(({ currencies }) =>
            currencies.map((currency) => (
              <th className={cx(styles.th, styles.columnSize)} key={uuid()}>
                {currency}
              </th>
            ))
          )}
        </tr>
      </thead>
      <tbody>
        {Object.entries(gains).map(([month, accountData], rowIndex) => (
          <tr className={cx({ [styles.contrast]: rowIndex % 2 })} key={month}>
            <td className={cx(styles.td, styles.border)}>{month}</td>
            {accountsInfo.map(({ name, currencies }) =>
              currencies.map((currency) => (
                <td
                  className={cx(styles.td, styles.right, styles.border, {
                    [styles.contrast]: rowIndex % 2,
                  })}
                  key={uuid()}
                >
                  {thousands(accountData[name]?.[currency]?.gain || 0)}
                </td>
              ))
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
