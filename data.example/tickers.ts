import { Stock } from '../types';

const tickers: {
  [key: string]: Stock;
} = {
  AAPL: {
    ticker: 'AAPL',
    optionSize: 100,
    currency: 'USD',
    colour: 'c1D1D1F',
  },
  BABA: {
    ticker: 'BABA',
    IEXTicker: '09988-HK',
    IBKRTicker: '9988',
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
