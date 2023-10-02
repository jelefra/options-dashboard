import { Stock } from '../types';

export const tickersMap = {
  BABA: '9988',
};

const tickers: {
  [key: string]: Stock;
} = {
  AAPL: {
    ticker: 'AAPL',
    optionSize: 100,
    currency: 'USD',
    colour: 'c1D1D1F',
  },
  '9988': {
    ticker: '9988',
    exchange: 'XHKG',
    optionSize: 500,
    currency: 'HKD',
    colour: 'cFE6601',
  },
  GOOG: {
    ticker: 'GOOG',
    optionSize: 100,
    currency: 'USD',
    colour: 'cED1C24',
  },
};

export default tickers;
