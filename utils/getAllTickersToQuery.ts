import { TradeData, TransactionData } from '../types';

const getAllTickersToQuery = (trades: TradeData[], transactions: TransactionData[]): string[] => [
  ...new Set([...trades.map(({ ticker }) => ticker), ...transactions.map(({ ticker }) => ticker)]),
];

export default getAllTickersToQuery;
