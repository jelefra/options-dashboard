import fetchTickerPrices from './fetchTickerPrices';
import getAllTickersToQuery from './getAllTickersToQuery';
import { removeNullValues } from './index';

import { TradeData, TransactionData } from '../types';

// @ts-ignore
import tradesData from '../data/options.csv';
// @ts-ignore
import transactionsData from '../data/transactions.csv';

const trades: TradeData[] = tradesData.map(removeNullValues);
const transactions: TransactionData[] = transactionsData.map(removeNullValues);

const fetchCallTickerPrices = () => {
  const allTickersToQuery = getAllTickersToQuery(trades, transactions);
  return fetchTickerPrices(allTickersToQuery);
};

export default fetchCallTickerPrices;
