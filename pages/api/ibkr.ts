import { createClient } from 'redis';
import type { NextApiRequest, NextApiResponse } from 'next';
import https from 'https';

import get from '../../utils/get';

import { THIRTY_DAYS_IN_SECONDS } from '../../constants';

const agent = new https.Agent({
  rejectUnauthorized: false,
});

const ibkr = async (req: NextApiRequest, res: NextApiResponse) => {
  const client = createClient();
  await client.connect();
  const { endpoint, id } = req.query;
  if (typeof endpoint === 'string' && typeof id === 'string') {
    const URL = `https://localhost:5000/v1/api/portfolio/${id}/${endpoint}`;
    const ledger = await get({
      client,
      URL,
      keyName: `${endpoint}-${id}`,
      expiry: THIRTY_DAYS_IN_SECONDS,
      fetchFnOptions: { agent },
    });
    res.status(200).json({ ledger });
  }
};

export default ibkr;
