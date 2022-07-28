import dayjs, { Dayjs } from 'dayjs';

import { INPUT_DATE_FORMAT } from '../constants';
import { Status, TradeData } from '../types';

export const calcAssignmentPct = (strike: number, currentStockPrice: number) =>
  strike / currentStockPrice - 1;

export const calcCashEquivalent = (optionSize: number, price: number) => optionSize * price;

export const calcCostBasisDrop = (netCost: number, grossCost: number) => netCost / grossCost - 1;

export const calcDteCurrent = (expiryDate: Dayjs, now: Dayjs) =>
  expiryDate?.add(1, 'day').diff(now, 'day');

export const calcDteTotal = (expiry: Dayjs, tradeDate: Dayjs) => expiry?.diff(tradeDate, 'day');

export const calcEffectiveNetReturnPct = (effectiveNetReturn: number, cashEquivalent: number) =>
  effectiveNetReturn / cashEquivalent;

export const calcPutNetCost = (
  strike: number,
  tradePrice: number,
  commission: number,
  optionSize: number
) => strike - tradePrice + commission / optionSize;

export const calcNetReturn = (optionSize: number, tradePrice: number, commission: number) =>
  optionSize * tradePrice - commission;

export const calcPriceIncrease = (
  currentStockPrice: number,
  stockPriceHigh: number,
  optionSize: number
) => Math.max((currentStockPrice - stockPriceHigh) * optionSize, 0);

export const calcPutDifference = (strike: number, currentStockPrice: number, optionSize: number) =>
  -Math.max(0, strike - currentStockPrice) * optionSize;

export const calcPutEffectiveNetReturn = (netReturn: number, difference: number) =>
  netReturn + difference;

export const calcReturn = (price: number, netCost: number, optionSize: number) =>
  (price - netCost) * optionSize;

export const calcReturnPct = (price: number, netCost: number) => price / netCost - 1;

export const calcReturnPctForPeriod = (returnPct: number, days: number, newPeriod: number) =>
  ((1 + returnPct) ** (1 / (days + 1))) ** newPeriod - 1;

export const calcStockPriceHigh = (
  price: number,
  tradePrice: number,
  commission: number,
  optionSize: number
) => price + tradePrice - commission / optionSize;

export const calcStockPricePct = (price: number, current: number) => price / current - 1;

export const calcStockPriceLow = (
  strike: number,
  tradePrice: number,
  commission: number,
  optionSize: number
) => strike - tradePrice - commission / optionSize;

export const convertToGBP = (amount: number, forexRate: number) => amount / forexRate;

export const getCallStatus = (strike: number, price: number): Status =>
  strike < price ? 'Assignable' : null;

export const getPutStatus = (strike: number, price: number): Status =>
  strike > price ? 'Assignable' : null;

export const isCurrentPut = ({ closePrice, expiry, type }: TradeData, now: Dayjs): boolean =>
  type === 'Put' && dayjs(expiry, INPUT_DATE_FORMAT).isSameOrAfter(now, 'day') && !closePrice;
