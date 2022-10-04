import { createClient } from 'redis';
import type { NextApiRequest, NextApiResponse } from 'next';

import get from '../../utils/get';

import { ExchangeRateResponse } from '../../types';

import { ONE_HOUR_IN_SECONDS } from '../../constants';

const forexRates = async (req: NextApiRequest, res: NextApiResponse) => {
  const client = createClient();
  await client.connect();
  const URL = 'https://api.exchangerate.host/latest?base=GBP';

  const response: ExchangeRateResponse = await get({
    client,
    URL,
    expiry: ONE_HOUR_IN_SECONDS,
    keyName: 'rates',
  });
  const rates = response.rates;
  res.status(200).json({ rates });
};

export default forexRates;
