import { createClient } from 'redis';
import type { NextApiRequest, NextApiResponse } from 'next';

import get from '../../utils/get';
import getForexRates from '../../utils/getForexRates';

import { ONE_HOUR_IN_SECONDS } from '../../constants';

const forexRates = async (req: NextApiRequest, res: NextApiResponse) => {
  const client = createClient();
  await client.connect();
  const rates = await get({
    client,
    fetchFn: getForexRates,
    keyName: 'rates',
    expiry: ONE_HOUR_IN_SECONDS,
  });
  res.status(200).json({ rates });
};

export default forexRates;
