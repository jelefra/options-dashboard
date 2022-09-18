import { createClient } from 'redis';
import type { NextApiRequest, NextApiResponse } from 'next';

import getRedisKeys from '../../utils/getRedisKeys';

const putCloseTradePrices = async (req: NextApiRequest, res: NextApiResponse) => {
  const client = createClient();
  await client.connect();
  const { ids } = req.query;
  if (typeof ids === 'string') {
    const keyNames = ids.split(',');
    const putCloseTradePrices = await getRedisKeys(keyNames);
    res.status(200).json({ putCloseTradePrices });
  }
};

export default putCloseTradePrices;
