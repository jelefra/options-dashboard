import { createClient } from 'redis';
import type { NextApiRequest, NextApiResponse } from 'next';

import { fetchFn } from '../../utils/fetch';
import get from '../../utils/get';

const fetchCreditUsage = () => {
  const endpoint = `https://cloud.iexapis.com/v1/account/usage/credits?token=${process.env.IEX_SECRET_KEY}`;
  return fetchFn({ endpoint });
};

const creditUsage = async (req: NextApiRequest, res: NextApiResponse) => {
  const client = createClient();
  await client.connect();
  const creditUsage = await get({
    client,
    fetchFn: fetchCreditUsage,
    keyName: 'creditUsage',
  });
  res.status(200).json({ creditUsage });
};

export default creditUsage;
