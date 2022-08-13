import { createClient } from 'redis';
import type { NextApiRequest, NextApiResponse } from 'next';
import dayjs from 'dayjs';

import get from '../../utils/get';
import fetchCallTickerPrices from '../../utils/fetchCallTickerPrices';

const callTickerPrices = async (req: NextApiRequest, res: NextApiResponse) => {
  const client = createClient();
  await client.connect();
  const { now } = req.query;
  if (typeof now === 'string') {
    const currentTickerPrices = await get({
      client,
      fetchFn: fetchCallTickerPrices,
      keyName: 'callTickerPrices',
      now: dayjs(now),
    });
    res.status(200).json({ currentTickerPrices });
  }
};

export default callTickerPrices;
