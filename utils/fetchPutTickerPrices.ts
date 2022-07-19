// @ts-ignore
import trades from '../data/options.csv';
import fetchTickerPrices from './fetchTickerPrices';
import getPutTickersToQuery from './getPutTickersToQuery';

const fetchPutTickerPrices = (now) => {
  const putTickersToQuery = getPutTickersToQuery(trades, now);
  return fetchTickerPrices(putTickersToQuery);
};

export default fetchPutTickerPrices;
