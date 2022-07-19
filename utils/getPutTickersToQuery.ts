import { isCurrentPut } from './index';

import { TradeData } from '../types';
import { Dayjs } from 'dayjs';

const getPutTickersToQuery = (trades: TradeData[], now: Dayjs): string[] => [
  ...new Set(trades.filter((trade) => isCurrentPut(trade, now)).map(({ ticker }) => ticker)),
];

export default getPutTickersToQuery;
