import { fetchFn } from './fetch';

import { ExchangeRateResponse } from '../types';

const getForexRates = async () => {
  const endpoint = 'https://api.exchangerate.host/latest?base=GBP';
  const response: ExchangeRateResponse = await fetchFn({ endpoint });
  const rates = response.rates || {};
  console.info('Fetched forex rates');
  return rates;
};

export default getForexRates;
