import { createClient } from 'redis';
import type { NextApiRequest, NextApiResponse } from 'next';
import https from 'https';

import get from '../../utils/get';
import { fetchFn } from '../../utils/fetch';
import { fetchPositions } from '../../utils/fetchPositions';

import { IBKR_DEFAULT_EXPIRY, IBKR_POSITIONS_EXPIRY } from '../../constants';

const agent = new https.Agent({
  rejectUnauthorized: false,
});

const fetchFunctions = {
  positions: fetchPositions,
};

const expiries = {
  positions: IBKR_POSITIONS_EXPIRY,
};

const ibkr = async (req: NextApiRequest, res: NextApiResponse) => {
  const client = createClient();
  await client.connect();
  const { endpoint, id } = req.query;
  if (typeof endpoint === 'string' && typeof id === 'string') {
    const URL = `https://localhost:5000/v1/api/portfolio/${id}/${endpoint}`;
    const value = await get({
      client,
      fetchFunction: fetchFunctions[endpoint] || fetchFn,
      URL,
      keyName: `${endpoint}-${id}`,
      expiry: expiries[endpoint] || IBKR_DEFAULT_EXPIRY,
      fetchFnOptions: { agent },
      ignoreCurrentCache: true,
    });
    res.status(200).json({ value });
  }
};

export default ibkr;
