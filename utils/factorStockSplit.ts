import dayjs, { Dayjs } from 'dayjs';

import { INPUT_DATE_FORMAT } from '../constants';

import { stockSplits } from '../data/stockSplits';

export const factorStockSplit = (ticker: string, quantity: number, tradeDate: Dayjs) => {
  if (stockSplits[ticker]) {
    const { date, ratio } = stockSplits[ticker];
    return (tradeDate.isBefore(dayjs(date, INPUT_DATE_FORMAT)) ? ratio : 1) * quantity;
  }
  return quantity;
};

export const factorStockSplitStockPrice = (
  ticker: string,
  stockPrice: number,
  tradeDate: Dayjs
) => {
  if (stockSplits[ticker]) {
    const { date, ratio } = stockSplits[ticker];
    return stockPrice / (tradeDate.isBefore(dayjs(date, INPUT_DATE_FORMAT)) ? ratio : 1);
  }
  return stockPrice;
};
