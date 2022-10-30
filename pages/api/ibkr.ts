import { createClient } from 'redis';
import type { NextApiRequest, NextApiResponse } from 'next';
import https from 'https';

import get from '../../utils/get';

import { IBKR_CACHE_DURATION } from '../../constants';

const agent = new https.Agent({
  rejectUnauthorized: false,
});

const ibkr = async (req: NextApiRequest, res: NextApiResponse) => {
  const client = createClient();
  await client.connect();
  const { endpoint, id } = req.query;
  if (typeof endpoint === 'string' && typeof id === 'string') {
    const URL = `https://localhost:5000/v1/api/portfolio/${id}/${endpoint}`;
    const value = await get({
      client,
      URL,
      keyName: `${endpoint}-${id}`,
      expiry: IBKR_CACHE_DURATION,
      fetchFnOptions: { agent },
      ignoreCurrentCache: true,
    });
    res.status(200).json({ value });
  }
};

export default ibkr;
