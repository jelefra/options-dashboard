import { createClient } from 'redis';
import type { NextApiRequest, NextApiResponse } from 'next';

import { removeNullValues } from '../../utils';
import fetchTickerPrices from '../../utils/fetchTickerPrices';

import { TradeData, TransactionData } from '../../types';

// @ts-ignore
import tradesData from '../../data/options.csv';
// @ts-ignore
import transactionsData from '../../data/transactions.csv';

const getAllTickersToQuery = () => {
  const trades: TradeData[] = tradesData.map(removeNullValues);
  const transactions: TransactionData[] = transactionsData.map(removeNullValues);
  return [
    ...new Set([
      ...trades.map(({ ticker }) => ticker),
      ...transactions.map(({ ticker }) => ticker),
    ]),
  ];
};

const allTickerPrices = async (req: NextApiRequest, res: NextApiResponse) => {
  const client = createClient();
  await client.connect();
  const { now } = req.query;
  if (typeof now === 'string') {
    const allTickersToQuery = getAllTickersToQuery();
    const currentTickerPrices = await fetchTickerPrices(allTickersToQuery);
    res.status(200).json({ currentTickerPrices });
  }
};

export default allTickerPrices;
