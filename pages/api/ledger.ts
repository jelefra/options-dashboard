import { createClient } from 'redis';
import type { NextApiRequest, NextApiResponse } from 'next';
import https from 'https';

import get from '../../utils/get';

import { THIRTY_DAYS_IN_SECONDS } from '../../constants';

const agent = new https.Agent({
  rejectUnauthorized: false,
});

const ledger = async (req: NextApiRequest, res: NextApiResponse) => {
  const client = createClient();
  await client.connect();
  const { id } = req.query;
  if (typeof id === 'string') {
    const URL = `https://localhost:5000/v1/api/portfolio/${id}/ledger`;
    const ledger = await get({
      client,
      URL,
      keyName: id,
      expiry: THIRTY_DAYS_IN_SECONDS,
      fetchFnOptions: { agent },
    });
    res.status(200).json({ ledger });
  }
};

export default ledger;
