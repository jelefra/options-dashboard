import { createClient } from 'redis';
import type { NextApiRequest, NextApiResponse } from 'next';

import getRedisKeys from '../../utils/getRedisKeys';

const closeTradePrices = async (req: NextApiRequest, res: NextApiResponse) => {
  const client = createClient();
  await client.connect();
  const { ids } = req.query;
  if (typeof ids === 'string') {
    const keyNames = ids.split(',');
    const closeTradePrices = await getRedisKeys(keyNames);
    res.status(200).json({ closeTradePrices });
  }
};

export default closeTradePrices;
