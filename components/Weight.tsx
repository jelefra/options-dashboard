import dayjs from 'dayjs';

import processData from '../utils/processData';
import { pctZero } from '../utils/format';

import { CurrentTickerPrices, ForexRates, Ledgers, TradeData, TransactionData } from '../types';

import tickers from '../data/tickers';

const NOW = dayjs();

const Weight = ({
  currencies,
  currentTickerPrices,
  ledgers,
  rates,
  trades,
  transactions,
}: {
  currencies: string[];
  currentTickerPrices: CurrentTickerPrices;
  ledgers: Ledgers;
  rates: ForexRates;
  trades: TradeData[];
  transactions: TransactionData[];
}) => {
  const { batches, stocks } = processData({ now: NOW, transactions, trades, currentTickerPrices });

  const currencyAmounts: { [key: string]: number } = {};

  for (let batch of Object.values(batches)) {
    const { optionSize, ticker } = batch;
    const { currency } = tickers[ticker];
    currencyAmounts[currency] = currencyAmounts[currency] || 0;
    currencyAmounts[currency] += optionSize * currentTickerPrices[ticker];
  }

  for (let stock of Object.values(stocks)) {
    if (stock.partialBatch) {
      const {
        ticker,
        partialBatch: { quantity },
      } = stock;
      const { currency } = tickers[ticker];
      currencyAmounts[currency] = currencyAmounts[currency] || 0;
      currencyAmounts[currency] += quantity * currentTickerPrices[ticker];
    }
  }

  for (let ledger of Object.values(ledgers)) {
    for (let entry of Object.entries(ledger)) {
      const [currency, data] = entry;
      const { cashbalance } = data;
      currencyAmounts[currency] = currencyAmounts[currency] || 0;
      currencyAmounts[currency] += cashbalance;
    }
  }

  const totalGBP = Object.entries(currencyAmounts)
    // Ignore "BASE" currency
    .filter(([currency]) => currencies.includes(currency))
    .reduce((totalGBP, [currency, amount]) => {
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
    <tr>
      <td>Weight</td>
      {currencies.map((currency, index) => (
        <td key={index}>{pctZero(currenciesPct[currency])}</td>
      ))}
    </tr>
  );
};

export default Weight;
