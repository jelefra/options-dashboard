import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from 'redis';
import cloneDeep from 'lodash.clonedeep';
import dayjs from 'dayjs';

import { removeNullValues, sanitiseOpenExchangeRatesLogs } from '../../utils';
import get from '../../utils/get';

import { ExchangeRateResponse, TradeData, TransactionData } from '../../types';

// @ts-ignore
import tradesData from '../../data/options.csv';
// @ts-ignore
import transactionsData from '../../data/transactions.csv';
import tickers from '../../data/tickers';

import { INPUT_DATE_FORMAT, TEN_YEARS_IN_SECONDS } from '../../constants';

const formatDateForAPI = (dateInBritishFormat): string => {
  const [dd, mm, yyyy] = dateInBritishFormat.split('/');
  return `${yyyy}-${mm}-${dd}`;
};

const constructURL = (date: string) =>
  `https://openexchangerates.org/api/historical/${formatDateForAPI(date)}.json?base=USD&app_id=${
    process.env.OPEN_EXCHANGE_RATES_APP_ID
  }`;

const forexRatesHistorical = async (req: NextApiRequest, res: NextApiResponse) => {
  const { from } = req.query;

  const filterFn =
    typeof from === 'string'
      ? ({ date }) => dayjs(date, INPUT_DATE_FORMAT).isSameOrAfter(dayjs(from, INPUT_DATE_FORMAT))
      : () => true;

  const transactions: TransactionData[] = transactionsData.map(removeNullValues).filter(filterFn);
  const trades: TradeData[] = tradesData.map(removeNullValues).filter(filterFn);

  const mutate = (dates, date, currency) => {
    dates[date] = Array.from(new Set([...(dates[date] || []), currency]));
  };

  const datesFromTransactions = transactions.reduce((dates, { date, ticker }) => {
    const { currency } = tickers[ticker];
    mutate(dates, date, currency);
    return dates;
  }, {});

  const dates: { [key: string]: string[] } = trades.reduce((dates, { date, closeDate, ticker }) => {
    const { currency } = tickers[ticker];
    [date, closeDate].filter(Boolean).forEach((date) => {
      mutate(dates, date, currency);
    });
    return dates;
  }, cloneDeep(datesFromTransactions));

  const historicalForexRates = await Promise.all(
    Object.entries(dates).map(async ([date, currencies], index) => {
      const URL = constructURL(date);
      const client = createClient();
      await client.connect();
      const response: ExchangeRateResponse = await get({
        client,
        URL,
        keyName: `rates-${formatDateForAPI(date)}`,
        expiry: TEN_YEARS_IN_SECONDS,
        // Delay queries to avoid 'Too Many Requests' (429) statuses
        initialFetchDelay: index * 100,
        logSanitiser: sanitiseOpenExchangeRatesLogs,
      });
      const ratesBaseUSD = response?.rates;
      const ratesBaseGBP = Object.fromEntries(
        currencies.map((currency) => [currency, ratesBaseUSD[currency] / ratesBaseUSD.GBP])
      );
      return { date, rates: ratesBaseGBP };
    })
  );

  const historicalRatesBaseGBP = historicalForexRates.reduce(
    (forexRatesAllDays, forexRatesOneDay) => {
      const { date, rates } = forexRatesOneDay;
      forexRatesAllDays[date] = rates;
      return forexRatesAllDays;
    },
    {}
  );

  return res.status(200).json({ historicalRates: historicalRatesBaseGBP });
};

export default forexRatesHistorical;
