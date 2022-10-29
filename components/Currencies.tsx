import dayjs from 'dayjs';

import processData from '../utils/processData';
import { decimalTwo, pctZero } from '../utils/format';

import { CurrentTickerPrices, ForexRates, Ledgers, TradeData, TransactionData } from '../types';

import tickers from '../data/tickers';

import styles from '../styles/Table.module.css';

const NOW = dayjs();

const Currencies = ({
  currentTickerPrices,
  ledgers,
  rates,
  trades,
  transactions,
}: {
  currentTickerPrices: CurrentTickerPrices;
  ledgers: Ledgers;
  rates: ForexRates;
  trades: TradeData[];
  transactions: TransactionData[];
}) => {
  const { batches, stocks } = processData(NOW, transactions, trades, currentTickerPrices);

  const currencyAmounts: { [key: string]: number } = {};

  for (let batch of Object.values(batches)) {
    const { quantity, ticker } = batch;
    const { currency } = tickers[ticker];
    const current = currentTickerPrices[ticker];
    currencyAmounts[currency] = currencyAmounts[currency] || 0;
    currencyAmounts[currency] += quantity * current;
  }

  for (let stock of Object.values(stocks)) {
    if (stock.partialBatch) {
      const { ticker } = stock;
      const { quantity } = stock.partialBatch;
      const { currency } = tickers[ticker];
      const current = currentTickerPrices[ticker];
      currencyAmounts[currency] = currencyAmounts[currency] || 0;
      currencyAmounts[currency] += quantity * current;
    }
  }

  for (let ledger of Object.values(ledgers)) {
    for (let entry of Object.entries(ledger)) {
      const [currency, data] = entry;
      const { cashbalance } = data;
      if (currency !== 'BASE') {
        currencyAmounts[currency] = currencyAmounts[currency] || 0;
        currencyAmounts[currency] += cashbalance;
      }
    }
  }

  const currencies = Object.keys(currencyAmounts);

  const totalGBP = Object.entries(currencyAmounts).reduce((totalGBP, [currency, amount]) => {
    totalGBP += amount / rates[currency];
    return totalGBP;
  }, 0);

  const currenciesPct = Object.entries(currencyAmounts).reduce(
    (currenciesPct, [currency, amount]) => {
      currenciesPct[currency] = amount / (rates[currency] * totalGBP);
      return currenciesPct;
    },
    {}
  );

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th />
          {currencies.sort().map((currency, index) => (
            <th key={index}>{currency}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Weight</td>
          {currencies.map((currency, index) => (
            <td key={index}>{pctZero(currenciesPct[currency])}</td>
          ))}
        </tr>
        <tr>
          <td>Forex rate</td>
          {currencies.map((currency, index) => (
            <td key={index}>{rates[currency] !== 1 && decimalTwo(rates[currency])}</td>
          ))}
        </tr>
      </tbody>
    </table>
  );
};

export default Currencies;
