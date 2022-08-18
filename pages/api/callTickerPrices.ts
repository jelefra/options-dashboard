import type { NextApiRequest, NextApiResponse } from 'next';

import { removeNullValues } from '../../utils';
import getCallTickersToQuery from '../../utils/getCallTickersToQuery';
import fetchTickerPrices from '../../utils/fetchTickerPrices';

import { TradeData, TransactionData } from '../../types';

// @ts-ignore
import tradesData from '../../data/options.csv';
// @ts-ignore
import transactionsData from '../../data/transactions.csv';

const callTickerPrices = async (req: NextApiRequest, res: NextApiResponse) => {
  const trades: TradeData[] = tradesData.map(removeNullValues);
  const transactions: TransactionData[] = transactionsData.map(removeNullValues);
  const callTickersToQuery = getCallTickersToQuery(trades, transactions);
  const currentTickerPrices = await fetchTickerPrices(callTickersToQuery);
  res.status(200).json({ currentTickerPrices });
};

export default callTickerPrices;
