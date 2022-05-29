import dayjs from 'dayjs';

import { PUT, TYPE, EXPIRY_DATE, CSV_DATE_FORMAT } from '../constants/constants';

const isCurrentPut = (trade) =>
  trade[TYPE] === PUT && dayjs(trade[EXPIRY_DATE], CSV_DATE_FORMAT).isSameOrAfter(dayjs(), 'day');

export default isCurrentPut;
