import {
  CALL,
  CLOSE_PRICE,
  PURCHASE,
  PUT,
  QUANTITY,
  SALE,
  STRIKE,
  TICKER,
  TYPE,
} from '../constants/constants';
import tickers from '../data/tickers';

const processTrades = (trades) => {
  const tickersFromTrades = {};
  for (let trade of trades) {
    const type = trade[TYPE];
    const closePrice = trade[CLOSE_PRICE];
    const strike = trade[STRIKE];
    const ticker = trade[TICKER];
    const size = tickers[ticker].size;

    if (type === PUT && closePrice && closePrice < strike) {
      tickersFromTrades[ticker] = (tickersFromTrades[ticker] || 0) + size;
    }

    if (type === CALL) {
      if (closePrice && closePrice > strike) {
        tickersFromTrades[ticker] = (tickersFromTrades[ticker] || 0) - size;
      }
    }
  }
  return tickersFromTrades;
};

const processTransactions = (transactions) => {
  const tickersFromTransactions = {};
  for (let transaction of transactions) {
    const type = transaction[TYPE];
    const ticker = transaction[TICKER];
    const quantity = transaction[QUANTITY];

    if (type === PURCHASE) {
      tickersFromTransactions[ticker] = (tickersFromTransactions[ticker] || 0) + quantity;
    }

    if (type === SALE) {
      tickersFromTransactions[ticker] = (tickersFromTransactions[ticker] || 0) - quantity;
    }
  }
  return tickersFromTransactions;
};

const getCallTickersToQuery = (trades, transactions) => {
  const tickersFromTrades = processTrades(trades);
  const tickersFromTransactions = processTransactions(transactions);

  const currentTickers = { ...tickersFromTrades };
  for (let ticker in tickersFromTransactions) {
    currentTickers[ticker] = (currentTickers[ticker] || 0) + tickersFromTransactions[ticker];
  }

  return [
    ...new Set(
      Object.entries(currentTickers)
        .filter(([, quantity]) => quantity > 0)
        .map(([ticker]) => ticker)
    ),
  ];
};

export default getCallTickersToQuery;
