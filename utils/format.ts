import { Dayjs } from 'dayjs';

import { DATE_SHORT_TERM, DATE_MEDIUM_TERM, DATE_LONG_TERM } from '../constants';

export const dateShortTerm = (day: Dayjs) => day.format(DATE_SHORT_TERM);

export const dateMediumTerm = (day: Dayjs) => day.format(DATE_MEDIUM_TERM);

export const dateLongTerm = (day: Dayjs) => day.format(DATE_LONG_TERM);

export const decimalTwo = (x: number) => x.toFixed(2);

export const pctOne = (x: number) => !isNaN(x) && `${(100 * x).toFixed(1)}%`;

export const pctZero = (x: number) => !isNaN(x) && `${(100 * x).toFixed(0)}%`;

export const thousands = (x: number) => x && x.toLocaleString().split('.')[0];

export const thousandsGBP = (x: number) => x && `£\u00A0${x.toLocaleString().split('.')[0]}`;

export const roundDown = (x: number, multiple = 100) => Math.floor(x / multiple) * multiple;
