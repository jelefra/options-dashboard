import { Dayjs } from 'dayjs';

import { stockSplits } from '../data/stockSplits';

export const factorStockSplit = (ticker: string, quantity: number, tradeDate: Dayjs) => {
  if (stockSplits[ticker]) {
    const { date, ratio } = stockSplits[ticker];
    return (tradeDate.isBefore(date) ? ratio : 1) * quantity;
  }
  return quantity;
};
