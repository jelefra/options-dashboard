import {
  BATCH,
  CALL,
  CLOSE_PRICE,
  PUT,
  STRIKE,
  TICKER,
  TYPE,
  WHEELING,
} from '../constants/constants';

const getCallTickersToQuery = (trades) => {
  const batches = {};
  for (let trade of trades) {
    const strike = trade[STRIKE];
    const closePrice = trade[CLOSE_PRICE];

    if (trade[TYPE] === PUT && trade[CLOSE_PRICE] && closePrice < strike) {
      batches[trade[BATCH]] = {
        [TICKER]: trade[TICKER],
        [WHEELING]: true,
      };
    }

    if (trade[TYPE] === CALL) {
      if (closePrice && closePrice > strike) {
        batches[trade[BATCH]][WHEELING] = false;
      }
    }
  }

  return [
    ...new Set(
      Object.values(batches)
        .filter(({ wheeling }) => wheeling)
        .map(({ [TICKER]: ticker }) => ticker)
    ),
  ];
};

export default getCallTickersToQuery;
