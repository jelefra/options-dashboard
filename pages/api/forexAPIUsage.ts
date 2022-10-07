import { createClient } from 'redis';
import type { NextApiRequest, NextApiResponse } from 'next';

import get from '../../utils/get';

import { FIFTEEN_MINUTES_IN_SECONDS } from '../../constants';

const forexAPIUsage = async (req: NextApiRequest, res: NextApiResponse) => {
  const client = createClient();
  await client.connect();
  const URL = `https://openexchangerates.org/api/usage.json?app_id=${process.env.OPEN_EXCHANGE_RATES_APP_ID}`;
  const response = await get({
    client,
    URL,
    keyName: 'forexAPIUsage',
    expiry: FIFTEEN_MINUTES_IN_SECONDS,
  });
  res.status(200).json({ usage: response.data.usage });
};

export default forexAPIUsage;
