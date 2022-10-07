import { createClient } from 'redis';
import type { NextApiRequest, NextApiResponse } from 'next';

import get from '../../utils/get';

import { ExchangeRateResponse } from '../../types';

import { ONE_DAY_IN_SECONDS } from '../../constants';

const forexRates = async (req: NextApiRequest, res: NextApiResponse) => {
  const client = createClient();
  await client.connect();
  const URL = `https://openexchangerates.org/api/latest.json?base=USD&app_id=${process.env.OPEN_EXCHANGE_RATES_APP_ID}`;

  const response: ExchangeRateResponse = await get({
    client,
    URL,
    expiry: ONE_DAY_IN_SECONDS,
    keyName: 'rates',
  });
  const ratesBaseUSD = response.rates;
  const ratesBaseGBP = Object.keys(ratesBaseUSD).reduce((ratesBaseGBP, currency) => {
    ratesBaseGBP[currency] = ratesBaseUSD[currency] / ratesBaseUSD.GBP;
    return ratesBaseGBP;
  }, {});
  res.status(200).json({ rates: ratesBaseGBP });
};

export default forexRates;
