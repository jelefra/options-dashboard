import { createClient } from 'redis';

import get from './get';
import { sanitiseIEXLogs } from './index';

import { IEXCloudStockResponse } from '../types';

import tickers from '../data/tickers';

const constructURL = (ticker: string) =>
  `https://cloud.iexapis.com/v1/stock/${tickers[ticker].IEXTicker || ticker}/quote?token=${
    process.env.IEX_PUBLISHABLE_KEY
  }`;

const fetchTickerPrices = async (
  tickersToQuery: string[]
): Promise<{
  [key: string]: number;
}> => {
  const tickerPrices = await Promise.all(
    tickersToQuery.map(async (ticker, index) => {
      const URL = constructURL(ticker);
      const client = createClient();
      await client.connect();
      const response: IEXCloudStockResponse = await get({
        client,
        URL,
        keyName: ticker,
        logSanitiser: sanitiseIEXLogs,
        // Delay queries to avoid 'Too Many Requests' (429) statuses
        initialFetchDelay: index * 100,
      });
      // Keys with `undefined` values will not be exposed
      const latestPrice = response?.latestPrice || null;
      return { ticker, latestPrice };
    })
  );

  return tickerPrices.reduce((tickerPriceMap, tickerWithPrice) => {
    const { ticker, latestPrice } = tickerWithPrice;
    tickerPriceMap[ticker] = latestPrice;
    return tickerPriceMap;
  }, {});
};

export default fetchTickerPrices;
