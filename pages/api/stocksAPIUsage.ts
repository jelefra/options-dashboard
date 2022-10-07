import { createClient } from 'redis';
import type { NextApiRequest, NextApiResponse } from 'next';

import get from '../../utils/get';

import { FIFTEEN_MINUTES_IN_SECONDS } from '../../constants';

const stocksAPIUsage = async (req: NextApiRequest, res: NextApiResponse) => {
  const client = createClient();
  await client.connect();
  const URL = `https://cloud.iexapis.com/v1/account/usage/credits?token=${process.env.IEX_SECRET_KEY}`;
  const response = await get({
    client,
    URL,
    keyName: 'stocksAPIUsage',
    expiry: FIFTEEN_MINUTES_IN_SECONDS,
  });
  res.status(200).json({ usage: response });
};

export default stocksAPIUsage;
