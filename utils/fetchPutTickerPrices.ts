import fetchTickerPrices from './fetchTickerPrices';
import getPutTickersToQuery from './getPutTickersToQuery';
import { removeNullValues } from './index';

import { TradeData } from '../types';

// @ts-ignore
import tradesData from '../data/options.csv';

const trades: TradeData[] = tradesData.map(removeNullValues);

const fetchPutTickerPrices = (now) => {
  const putTickersToQuery = getPutTickersToQuery(trades, now);
  return fetchTickerPrices(putTickersToQuery);
};

export default fetchPutTickerPrices;
