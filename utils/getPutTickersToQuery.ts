import isCurrentPut from './isCurrentPut';

import { TICKER } from '../constants/constants';

const getPutTickersToQuery = (trades) => [
  ...new Set(trades.filter(isCurrentPut).map(({ [TICKER]: ticker }) => ticker)),
];

export default getPutTickersToQuery;
