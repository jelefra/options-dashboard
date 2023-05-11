import { createClient } from 'redis';
import type { NextApiRequest, NextApiResponse } from 'next';

import get from '../../utils/get';
import { sanitiseOpenExchangeRatesLogs } from '../../utils';

import { ExchangeRateResponse } from '../../types';

const forexRates = async (req: NextApiRequest, res: NextApiResponse) => {
  const client = createClient();
  await client.connect();
  const URL = `https://openexchangerates.org/api/latest.json?base=USD&app_id=${process.env.OPEN_EXCHANGE_RATES_APP_ID}`;

  const response: ExchangeRateResponse = await get({
    client,
    URL,
    keyName: 'rates',
    logSanitiser: sanitiseOpenExchangeRatesLogs,
  });
  const ratesBaseUSD = response.rates;
  const ratesBaseGBP = Object.keys(ratesBaseUSD).reduce((ratesBaseGBP, currency) => {
    ratesBaseGBP[currency] = ratesBaseUSD[currency] / ratesBaseUSD.GBP;
    return ratesBaseGBP;
  }, {});
  res.status(200).json({ rates: ratesBaseGBP });
};

export default forexRates;
