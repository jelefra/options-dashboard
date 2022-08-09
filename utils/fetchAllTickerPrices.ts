import fetchTickerPrices from './fetchTickerPrices';
import getAllTickersToQuery from './getAllTickersToQuery';

// @ts-ignore
import trades from '../data/options.csv';
// @ts-ignore
import transactions from '../data/transactions.csv';

const fetchCallTickerPrices = () => {
  const allTickersToQuery = getAllTickersToQuery(trades, transactions);
  return fetchTickerPrices(allTickersToQuery);
};

export default fetchCallTickerPrices;
