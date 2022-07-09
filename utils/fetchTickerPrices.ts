import tickers from '../data/tickers';

const fetchTickerPrices = async (tickersToQuery) => {
  const currentTickerPricesMap = await Promise.all(
    tickersToQuery.map(async (ticker) => {
      const endpoint = `https://cloud.iexapis.com/v1/stock/${
        tickers[ticker].actual || ticker
      }/quote?token=${process.env.IEX_PUBLISHABLE_KEY}`;
      const { latestPrice } = await fetch(endpoint).then((response) => response.json());
      return { ticker, latestPrice };
    })
  );

  return currentTickerPricesMap.reduce((acc, cv) => {
    const { ticker, latestPrice } = cv;
    acc[ticker] = latestPrice;
    return acc;
  }, {});
};

export default fetchTickerPrices;
