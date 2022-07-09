// @ts-ignore
import trades from '../data/options.csv';
import fetchTickerPrices from './fetchTickerPrices';
import getPutTickersToQuery from './getPutTickersToQuery';

const fetchPutTickerPrices = () => {
  const putTickersToQuery = getPutTickersToQuery(trades);
  return fetchTickerPrices(putTickersToQuery);
};

export default fetchPutTickerPrices;
