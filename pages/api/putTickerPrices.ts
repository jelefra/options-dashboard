import { createClient } from 'redis';
import type { NextApiRequest, NextApiResponse } from 'next';
import dayjs, { Dayjs } from 'dayjs';

import fetchTickerPrices from '../../utils/fetchTickerPrices';
import { isCurrentPut, removeNullValues } from '../../utils';

import { TradeData } from '../../types';

// @ts-ignore
import tradesData from '../../data/options.csv';

const getPutTickersToQuery = (trades: TradeData[], now: Dayjs): string[] => [
  ...new Set(trades.filter((trade) => isCurrentPut(trade, now)).map(({ ticker }) => ticker)),
];

const putTickerPrices = async (req: NextApiRequest, res: NextApiResponse) => {
  const client = createClient();
  await client.connect();
  const { now } = req.query;
  if (typeof now === 'string') {
    const trades: TradeData[] = tradesData.map(removeNullValues);
    const putTickersToQuery = getPutTickersToQuery(trades, dayjs(now));
    const currentTickerPrices = await fetchTickerPrices(putTickersToQuery);
    res.status(200).json({ currentTickerPrices });
  }
};

export default putTickerPrices;
