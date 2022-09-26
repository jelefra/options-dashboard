import cx from 'classnames';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
dayjs.extend(customParseFormat);

import { dateMediumTerm, thousands } from '../utils/format';
import { removeNullValues } from '../utils';

import { INPUT_DATE_FORMAT } from '../constants';
import { Account, BatchCost, TradeData, TransactionData } from '../types';

// @ts-ignore
import tradesData from '../data/options.csv';
// @ts-ignore
import transactionsData from '../data/transactions.csv';
import tickers from '../data/tickers';
import accounts from '../data/accounts';

import styles from '../styles/Table.module.css';

const getPurchaseCostFromTransactions = (transactions: TransactionData[]) => {
  const batches: { [key: string]: BatchCost } = {};

  for (let transaction of transactions) {
    const { batchCodes: batchCodesStr } = transaction;
    const { commission, quantity, stockPrice, type } = transaction;

    if (type === 'Purchase' && batchCodesStr) {
      const batchCodes = batchCodesStr.includes(',') ? batchCodesStr.split(',') : [batchCodesStr];

      for (let batchCode of batchCodes) {
        batches[batchCode] = batches[batchCode] || {
          batchCode,
          acquisitionCost: 0,
          quantity: 0,
        };

        const batch = batches[batchCode];
        const batchCommission = commission / batchCodes.length;
        const batchQuantity = quantity / batchCodes.length;
        const oldAcquisitionCost = batch.acquisitionCost;
        const oldQuantity = batch.quantity;
        batch.acquisitionCost =
          (oldAcquisitionCost * oldQuantity + stockPrice * batchQuantity + batchCommission) /
          (oldQuantity + batchQuantity);
        batch.quantity += batchQuantity;
      }
    }
  }

  return batches;
};

const getPurchaseCostFromTrades = (trades: TradeData[]) => {
  const batches: { [key: string]: BatchCost } = {};
  for (let trade of trades) {
    const { batchCode, closePrice, strike, ticker, type } = trade;
    const { optionSize } = tickers[ticker];

    if (type === 'Put' && closePrice && closePrice < strike) {
      batches[batchCode] = {
        batchCode,
        acquisitionCost: strike,
        quantity: optionSize,
      };
    }
  }
  return batches;
};

const getPurchaseCost = (transactions: TransactionData[], trades: tradesData[]) => {
  const purchaseCostFromTransactions = getPurchaseCostFromTransactions(transactions);
  const purchaseCostFromTrades = getPurchaseCostFromTrades(trades);
  return { ...purchaseCostFromTrades, ...purchaseCostFromTransactions };
};

const CapitalGains = () => {
  const transactions: TransactionData[] = transactionsData.map(removeNullValues);
  const trades: TradeData[] = tradesData.map(removeNullValues);

  const batches = getPurchaseCost(transactions, trades);

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
      gains[tradeMonth][account][currency].gain += (strike - acquisitionCost) * optionSize;
    }
  }

  const accountsInfo = Object.values(accountsWithCurrencies).filter(
    ({ capitalGains }) => capitalGains
  );

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
          {accountsInfo.map(({ name, currencies }) =>
            currencies.map((currency) => (
              <th className={cx(styles.th, styles.columnSize)} key={`${name}-${currency}`}>
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
  );
};

export default CapitalGains;
