import type { StockSplits } from '../types';
import { setDate } from '../utils';

export const stockSplits: StockSplits = {
  AMZN: { date: setDate('03/06/2022'), ratio: 20 },
  GOOG: { date: setDate('15/07/2022'), ratio: 20 },
};
