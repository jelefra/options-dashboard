import tickers from '../data/tickers';
import { TradeData, TransactionData } from '../types';

const processTrades = (trades: TradeData[]) => {
  const tickersFromTrades: {
    [key: string]: number;
  } = {};

  for (let trade of trades) {
    const { type, closePrice, strike, ticker } = trade;
    const size = tickers[ticker].optionSize;

    if (type === 'Put' && closePrice && closePrice < strike) {
      tickersFromTrades[ticker] = (tickersFromTrades[ticker] || 0) + size;
    }

    if (type === 'Call' && closePrice && closePrice > strike) {
      tickersFromTrades[ticker] = (tickersFromTrades[ticker] || 0) - size;
    }
  }
  return tickersFromTrades;
};

const processTransactions = (transactions: TransactionData[]) => {
  const tickersFromTransactions: {
    [key: string]: number;
  } = {};

  for (let transaction of transactions) {
    const { quantity, ticker, type } = transaction;

    if (type === 'Purchase') {
      tickersFromTransactions[ticker] = (tickersFromTransactions[ticker] || 0) + quantity;
    }

    if (type === 'Sale') {
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
