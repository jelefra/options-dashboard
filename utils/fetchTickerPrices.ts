import tickers from '../data/tickers';

const fetchTickerPrices = async (
  tickersToQuery: string[]
): Promise<{
  [key: string]: number;
}> => {
  const tickerPrices = await Promise.all(
    tickersToQuery.map(async (ticker) => {
      const endpoint = `https://cloud.iexapis.com/v1/stock/${
        tickers[ticker].officialTicker || ticker
      }/quote?token=${process.env.IEX_PUBLISHABLE_KEY}`;
      const { latestPrice } = await fetch(endpoint).then((response) => response.json());
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
