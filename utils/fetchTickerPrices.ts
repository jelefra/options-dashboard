import { fetchFn } from './fetch';

import { IEXCloudStockResponse } from '../types';

import tickers from '../data/tickers';

const constructEndpoint = (ticker: string) =>
  `https://cloud.iexapis.com/v1/stock/${tickers[ticker].officialTicker || ticker}/quote?token=${
    process.env.IEX_PUBLISHABLE_KEY
  }`;

const fetchTickerPrices = async (
  tickersToQuery: string[]
): Promise<{
  [key: string]: number;
}> => {
  const tickerPrices = await Promise.all(
    tickersToQuery.map(async (ticker, index) => {
      const endpoint = constructEndpoint(ticker);
      // Delay queries to avoid 'Too Many Requests' (429) statuses
      await new Promise((resolve) => setTimeout(resolve, index * 25));
      const response: IEXCloudStockResponse | null = await fetchFn({ ticker, endpoint });
      const latestPrice = response.latestPrice || null;
      return { ticker, latestPrice };
    })
  );

  console.info('Fetched ticker prices');

  return tickerPrices.reduce((tickerPriceMap, tickerWithPrice) => {
    const { ticker, latestPrice } = tickerWithPrice;
    tickerPriceMap[ticker] = latestPrice;
    return tickerPriceMap;
  }, {});
};

export default fetchTickerPrices;
