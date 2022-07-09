// @ts-ignore
import trades from '../data/options.csv';
// @ts-ignore
import transactions from '../data/transactions.csv';
import fetchTickerPrices from './fetchTickerPrices';
import getCallTickersToQuery from './getCallTickersToQuery';

const fetchCallTickerPrices = () => {
  const putTickersToQuery = getCallTickersToQuery(trades, transactions);
  return fetchTickerPrices(putTickersToQuery);
};

export default fetchCallTickerPrices;
