import dayjs, { Dayjs } from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
dayjs.extend(isSameOrAfter);

import { INPUT_DATE_FORMAT } from '../constants';
import { tickersMap } from '../data/tickers';
import { Accounts, Position, TradeData, TradeType } from '../types';

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
  type === 'Put' &&
  dayjs(expiry, INPUT_DATE_FORMAT).isSameOrAfter(now, 'day') &&
  (!closePrice || false);

export const removeNullValues = (obj: object) =>
  Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== null));

export const formatDaysToEarnings = (n: number) => (Math.abs(n) < 30 ? n : '');

export const categoriseEarnings = (
  earningsDate: Dayjs,
  expiry: Dayjs | undefined,
  now: Dayjs,
  confirmed: boolean
): 'warning' | 'danger' | 'info' | 'transparent' | '' => {
  if (!expiry) return '';
  const daysToEarnings = earningsDate.diff(expiry, 'day');
  if (earningsDate.isSameOrAfter(now, 'day')) {
    if (daysToEarnings > -30 && daysToEarnings <= -15) return 'info';
    if (daysToEarnings > -15 && daysToEarnings <= 0 && confirmed) return 'danger';
    if (daysToEarnings > -15 && daysToEarnings <= 0 && !confirmed) return 'warning';
    if (daysToEarnings > 0 && daysToEarnings <= 30) return 'info';
  }
  if (earningsDate.isBefore(now) && daysToEarnings > -30) return 'transparent';
  return '';
};

export const getPositionsKeys = (accounts: Accounts) =>
  Object.values(accounts)
    .map(({ id }) => `positions-${id}`)
    .join(',');

export const getPosition = (
  positions: Position[],
  ticker: string,
  expiry: Dayjs,
  strike: number,
  type: TradeType
) =>
  positions.length
    ? positions.find(
        (position) =>
          position?.fullName === `${ticker} ${expiry?.format("MMMDD'YY")} ${strike} ${type}`
      )
    : undefined;

export const sanitiseFinnhubLogs = (URL: string) => URL.replace(/token=\w+/, 'token=***');
export const sanitiseMarketstackLogs = (URL: string) =>
  URL.replace(/access_key=\w+/, 'access_key=***');
export const sanitiseAlphaVantageLogs = (URL: string) => URL.replace(/apikey=\w+/, 'apikey=***');
export const sanitiseOpenExchangeRatesLogs = (URL: string) =>
  URL.replace(/app_id=\w+/, 'app_id=***');

export const getTickerDisplayName = (ticker: string) =>
  (Object.entries(tickersMap).find(([, officialName]) => officialName === ticker) || [ticker])[0];
