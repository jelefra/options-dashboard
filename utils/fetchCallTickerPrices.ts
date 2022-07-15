// @ts-ignore
import trades from '../data/options.csv';
// @ts-ignore
import transactions from '../data/transactions.csv';
import fetchTickerPrices from './fetchTickerPrices';
import getCallTickersToQuery from './getCallTickersToQuery';

const fetchCallTickerPrices = () => {
  const callTickersToQuery = getCallTickersToQuery(trades, transactions);
  return fetchTickerPrices(callTickersToQuery);
};

export default fetchCallTickerPrices;
