import { Dayjs } from 'dayjs';

import { DATE_LONG_HORIZON, DATE_MEDIUM_HORIZON, DATE_SHORT_HORIZON } from '../constants';

export const dateShortTerm = (day: Dayjs) => day.format(DATE_SHORT_HORIZON);

export const dateMediumTerm = (day: Dayjs) => day.format(DATE_MEDIUM_HORIZON);

export const dateLongTerm = (day: Dayjs) => day.format(DATE_LONG_HORIZON);

export const decimalTwo = (x: number) => x.toFixed(2);

export const pctN = (x: number, n: number) => {
  if (isNaN(x)) return false;

  const percentage = (100 * x).toLocaleString('en-GB', {
    minimumFractionDigits: n,
    maximumFractionDigits: n,
  });

  return `${percentage}%`;
};

export const pctZero = (x: number) => pctN(x, 0);

export const pctOne = (x: number) => pctN(x, 1);

export const thousands = (x: number) => {
  if (!x) return false;
  return x.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

export const thousandsGBP = (x: number) => {
  if (!x) return false;

  return `£\u00A0${x.toLocaleString('en-GB', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
};

export const roundDown = (x: number, multiple = 100) => Math.floor(x / multiple) * multiple;

export const hoursToDays = (h: number) => (h <= 0 ? Math.ceil(h / 24) - 1 : Math.floor(h / 24));
