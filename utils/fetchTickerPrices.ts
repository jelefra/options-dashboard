import { createClient } from 'redis';

import { ONE_HOUR_IN_SECONDS } from '../constants';
import tickers from '../data/tickers';
import { FinnhubQuote, MarketstackTickerEOD } from '../types';
import { fetchAndStore, getFromRedis } from './get';
import { sanitiseFinnhubLogs, sanitiseMarketstackLogs } from './index';

/* eslint-disable no-unused-vars */
type ExchangeInfo = {
  constructURL: (ticker: string) => string;
  extractPrice: (response: object) => number;
  expiry?: number;
  logSanitiser: (URL: string) => string;
};
/* eslint-enable no-unused-vars */

const getExchangeInfo = (exchange: string): ExchangeInfo => {
  switch (exchange) {
    case 'XHKG':
      return {
        constructURL: (ticker) =>
          `http://api.marketstack.com/v1/tickers/${ticker}.${exchange}/eod/latest?access_key=${process.env.MARKETSTACK_KEY}`,
        extractPrice: (response: MarketstackTickerEOD) => response?.close ?? null,
        logSanitiser: sanitiseMarketstackLogs,
      };
    case 'XLON':
      return {
        constructURL: (ticker) =>
          `http://api.marketstack.com/v1/tickers/${ticker}.${exchange}/eod/latest?access_key=${process.env.MARKETSTACK_KEY}`,
        extractPrice: (response: MarketstackTickerEOD) => response?.close / 100 ?? null,
        logSanitiser: sanitiseMarketstackLogs,
      };
    default:
      return {
        constructURL: (ticker) =>
          `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${process.env.FINNHUB_API_KEY}`,
        extractPrice: (response: FinnhubQuote) => response?.c ?? null,
        logSanitiser: sanitiseFinnhubLogs,
      };
  }
};

const fetchTickerPrices = async (
  tickersToQuery: string[],
  ignoreCurrentCache: boolean = false
): Promise<{
  [key: string]: number;
}> => {
  let countOfTickersToQueryFromAPI = 0;
  const tickerPrices = await Promise.all(
    tickersToQuery.map(async (ticker) => {
      const exchange = tickers[ticker].exchange;
      const {
        constructURL,
        expiry = ONE_HOUR_IN_SECONDS,
        logSanitiser,
        extractPrice,
      } = getExchangeInfo(exchange);
      const URL = constructURL(tickers[ticker].ticker);
      const client = createClient();
      await client.connect();
      const redisData = await getFromRedis(client, ticker);
      if (!ignoreCurrentCache && redisData) {
        const latestPrice = extractPrice(redisData);
        return { ticker, latestPrice };
      } else {
        const response = await fetchAndStore({
          client,
          URL,
          keyName: ticker,
          expiry,
          logSanitiser,
          // Delay queries to avoid 'Too Many Requests' (429) statuses
          initialFetchDelay: countOfTickersToQueryFromAPI * 100,
        });
        countOfTickersToQueryFromAPI++;
        const latestPrice = extractPrice(response);
        return { ticker, latestPrice };
      }
    })
  );

  return tickerPrices.reduce((tickerPriceMap: { [key: string]: number }, tickerWithPrice) => {
    const { ticker, latestPrice } = tickerWithPrice;
    tickerPriceMap[ticker] = latestPrice;
    return tickerPriceMap;
  }, {});
};

export default fetchTickerPrices;
