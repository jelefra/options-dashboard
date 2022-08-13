import { createClient } from 'redis';
import type { NextApiRequest, NextApiResponse } from 'next';
import dayjs from 'dayjs';

import get from '../../utils/get';
import fetchPutTickerPrices from '../../utils/fetchPutTickerPrices';

const putTickerPrices = async (req: NextApiRequest, res: NextApiResponse) => {
  const client = createClient();
  await client.connect();
  const { now } = req.query;
  if (typeof now === 'string') {
    const currentTickerPrices = await get({
      client,
      fetchFn: fetchPutTickerPrices,
      keyName: 'callTickerPrices',
      now: dayjs(now),
    });
    res.status(200).json({ currentTickerPrices });
  }
};

export default putTickerPrices;
