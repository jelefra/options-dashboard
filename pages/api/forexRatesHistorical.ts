import dayjs from 'dayjs';
import cloneDeep from 'lodash.clonedeep';
import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from 'redis';

import { INPUT_DATE_FORMAT, TEN_YEARS_IN_SECONDS } from '../../constants';
// @ts-ignore
import tradesData from '../../data/options.csv';
import tickers, { tickersMap } from '../../data/tickers';
// @ts-ignore
import transactionsData from '../../data/transactions.csv';
import { ExchangeRateResponse, TradeData, TransactionData } from '../../types';
import { removeNullValues, sanitiseOpenExchangeRatesLogs } from '../../utils';
import get from '../../utils/get';

const formatDateForAPI = (dateInBritishFormat: string): string => {
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
      ? ({ date }: { date: string }) =>
          dayjs(date, INPUT_DATE_FORMAT).isSameOrAfter(dayjs(from, INPUT_DATE_FORMAT))
      : () => true;

  const transactions: TransactionData[] = transactionsData.map(removeNullValues).filter(filterFn);
  const trades: TradeData[] = tradesData.map(removeNullValues).filter(filterFn);

  const mutate = (dates: { [key: string]: string[] }, date: string, currency: string) => {
    dates[date] = Array.from(new Set([...(dates[date] || []), currency]));
  };

  const datesFromTransactions = transactions.reduce((dates, { date, ticker }) => {
    const { currency } = tickers[tickersMap[ticker] ?? ticker];
    mutate(dates, date, currency);
    return dates;
  }, {});

  const dates: { [key: string]: string[] } = trades.reduce((dates, { date, closeDate, ticker }) => {
    const { currency } = tickers[tickersMap[ticker] ?? ticker];
    [date, closeDate].filter(Boolean).forEach((date) => {
      // `filter(Boolean)` ensures `date` is defined
      mutate(dates, date as NonNullable<typeof date>, currency);
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

  const historicalRatesBaseGBP = historicalForexRates.reduce<{
    [key: string]: { [key: string]: number };
  }>((forexRatesAllDays, forexRatesOneDay) => {
    const { date, rates } = forexRatesOneDay;
    forexRatesAllDays[date] = rates;
    return forexRatesAllDays;
  }, {});

  return res.status(200).json({ historicalRates: historicalRatesBaseGBP });
};

export default forexRatesHistorical;
