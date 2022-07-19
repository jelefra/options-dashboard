import { Dayjs } from 'dayjs';

import { DISPLAY_DATE_FORMAT } from '../constants';

export const date = (day: Dayjs) => day.format(DISPLAY_DATE_FORMAT);

export const decimalTwo = (x: number) => x.toFixed(2);

export const pctOne = (x: number) => `${(100 * x).toFixed(1)}%`;

export const pctZero = (x: number) => `${(100 * x).toFixed(0)}%`;

export const thousands = (x: number) => x && x.toLocaleString().split('.')[0];
