import tickers, { tickersMap } from '../data/tickers';
import { TradeData, TransactionData } from '../types';

const processTrades = (trades: TradeData[]) => {
  const tickersFromTrades: {
    [key: string]: number;
  } = {};

  for (let trade of trades) {
    const { type, closePrice, strike, ticker: displayTicker } = trade;
    const { optionSize, ticker } = tickers[tickersMap[displayTicker] ?? displayTicker];

    if (type === 'Put' && closePrice && closePrice < strike) {
      tickersFromTrades[ticker] = (tickersFromTrades[ticker] || 0) + optionSize;
    }

    if (type === 'Call' && closePrice && closePrice > strike) {
      tickersFromTrades[ticker] = (tickersFromTrades[ticker] || 0) - optionSize;
    }
  }
  return tickersFromTrades;
};

const processTransactions = (transactions: TransactionData[]) => {
  const tickersFromTransactions: {
    [key: string]: number;
  } = {};

  for (let transaction of transactions) {
    const { quantity, ticker: displayTicker, type } = transaction;
    const { ticker } = tickers[tickersMap[displayTicker] ?? displayTicker];

    if (type === 'Purchase') {
      tickersFromTransactions[ticker] = (tickersFromTransactions[ticker] || 0) + quantity;
    }

    if (type === 'Sale') {
      tickersFromTransactions[ticker] = (tickersFromTransactions[ticker] || 0) - quantity;
    }
  }
  return tickersFromTransactions;
};

const getCallTickersToQuery = (trades: TradeData[], transactions: TransactionData[]) => {
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
