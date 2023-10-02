// @ts-ignore
import tradesData from '../data/options.csv';
import tickers, { tickersMap } from '../data/tickers';
// @ts-ignore
import transactionsData from '../data/transactions.csv';
import { TradeData, TransactionData } from '../types';
import { removeNullValues } from './index';

const getAllTickersToQuery = () => {
  const trades: TradeData[] = tradesData.map(removeNullValues);
  const transactions: TransactionData[] = transactionsData.map(removeNullValues);
  return [
    ...new Set([
      ...trades.map(({ ticker }) => tickers[tickersMap[ticker] ?? ticker].ticker),
      ...transactions.map(({ ticker }) => tickers[tickersMap[ticker] ?? ticker].ticker),
    ]),
  ];
};

export default getAllTickersToQuery;
