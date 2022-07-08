import dayjs from 'dayjs';

import { PUT, TYPE, EXPIRY_DATE, CSV_DATE_FORMAT, CLOSE_PRICE } from '../constants/constants';

const isCurrentPut = (trade) =>
  trade[TYPE] === PUT &&
  dayjs(trade[EXPIRY_DATE], CSV_DATE_FORMAT).isSameOrAfter(dayjs(), 'day') &&
  !trade[CLOSE_PRICE];

export default isCurrentPut;
