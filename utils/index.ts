import dayjs, { Dayjs } from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
dayjs.extend(isSameOrAfter);

import { INPUT_DATE_FORMAT } from '../constants';
import { Accounts, Position, TradeData, TradeType } from '../types';
import tickers from '../data/tickers';

export const calcDteCurrent = (expiryDate: Dayjs, now: Dayjs) =>
  expiryDate?.add(1, 'day').diff(now, 'day');

export const calcDteTotal = (expiry: Dayjs, tradeDate: Dayjs) => expiry?.diff(tradeDate, 'day');

export const calcPriceIncrease = (
  currentStockPrice: number,
  stockPriceHigh: number,
  optionSize: number
) => Math.max((currentStockPrice - stockPriceHigh) * optionSize, 0);

export const calcPutDifference = (strike: number, currentStockPrice: number, optionSize: number) =>
  -Math.max(0, strike - currentStockPrice) * optionSize;

export const calcReturnPctForPeriod = (returnPct: number, days: number, newPeriod: number) =>
  ((1 + returnPct) ** (1 / (days + 1))) ** newPeriod - 1;

export const isCurrentPut = ({ closePrice, expiry, type }: TradeData, now: Dayjs): boolean =>
  type === 'Put' && dayjs(expiry, INPUT_DATE_FORMAT).isSameOrAfter(now, 'day') && !closePrice;

export const removeNullValues = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== null));

export const formatDaysToEarnings = (n: number) => (Math.abs(n) < 15 ? n : '');

export const daysToEarningsInfo = (daysToEarnings: number, confirmed: boolean) =>
  daysToEarnings > 0 && daysToEarnings < 15 && !confirmed;

export const daysToEarningsWarning = (daysToEarnings: number, confirmed: boolean) =>
  daysToEarnings > -15 && daysToEarnings <= 0 && !confirmed;

export const daysToEarningsDanger = (daysToEarnings: number, confirmed: boolean) =>
  daysToEarnings > -15 && daysToEarnings < 0 && confirmed;

export const getPositionsKeys = (accounts: Accounts) =>
  Object.values(accounts)
    .map(({ id }) => `positions-${id}`)
    .join(',');

export const getPosition = (
  positions: Position[],
  ticker,
  expiry: Dayjs,
  strike: number,
  type: TradeType
) =>
  positions.length &&
  positions.find(
    (position) =>
      position?.fullName ===
      `${tickers[ticker]?.IBKRTicker || ticker} ${expiry?.format("MMMDD'YY")} ${strike} ${type}`
  );

export const sanitiseIEXLogs = (URL) => URL.replace(/pk_\w+/, 'pk_***');
export const sanitiseOpenExchangeRatesLogs = (URL) => URL.replace(/app_id=\w+/, 'app_id=***');
