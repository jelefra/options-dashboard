import fetchTickerPrices from './fetchTickerPrices';
import getCallTickersToQuery from './getCallTickersToQuery';
import { removeNullValues } from './index';

import { TradeData, TransactionData } from '../types';

// @ts-ignore
import tradesData from '../data/options.csv';
// @ts-ignore
import transactionsData from '../data/transactions.csv';

const fetchCallTickerPrices = () => {
  const trades: TradeData[] = tradesData.map(removeNullValues);
  const transactions: TransactionData[] = transactionsData.map(removeNullValues);
  const callTickersToQuery = getCallTickersToQuery(trades, transactions);
  return fetchTickerPrices(callTickersToQuery);
};

export default fetchCallTickerPrices;
