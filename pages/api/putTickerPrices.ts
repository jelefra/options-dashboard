import dayjs, { Dayjs } from 'dayjs';
import type { NextApiRequest, NextApiResponse } from 'next';

// @ts-ignore
import tradesData from '../../data/options.csv';
import { TradeData } from '../../types';
import { isCurrentPut, removeNullValues } from '../../utils';
import fetchTickerPrices from '../../utils/fetchTickerPrices';

const getPutTickersToQuery = (trades: TradeData[], now: Dayjs): string[] => [
  ...new Set(trades.filter((trade) => isCurrentPut(trade, now)).map(({ ticker }) => ticker)),
];

const putTickerPrices = async (req: NextApiRequest, res: NextApiResponse) => {
  const { now } = req.query;
  if (typeof now === 'string') {
    const trades: TradeData[] = tradesData.map(removeNullValues);
    const putTickersToQuery = getPutTickersToQuery(trades, dayjs(now));
    const currentTickerPrices = await fetchTickerPrices(putTickersToQuery);
    res.status(200).json({ currentTickerPrices });
  }
};

export default putTickerPrices;
