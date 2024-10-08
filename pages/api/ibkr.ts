import https from 'https';
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from 'redis';

import { IBKR_DEFAULT_EXPIRY, IBKR_POSITIONS_EXPIRY } from '../../constants';
import { fetchFn } from '../../utils/fetch';
import { fetchPositions } from '../../utils/fetchPositions';
import get from '../../utils/get';

const agent = new https.Agent({
  rejectUnauthorized: false,
});

const fetchFunctions: { [key: string]: Function } = {
  positions: fetchPositions,
};

const expiries: { [key: string]: number } = {
  positions: IBKR_POSITIONS_EXPIRY,
};

const ibkr = async (req: NextApiRequest, res: NextApiResponse) => {
  const client = createClient();
  await client.connect();
  const { endpoint, id } = req.query;
  if (typeof endpoint === 'string' && typeof id === 'string') {
    const URL = `https://127.0.0.1:5000/v1/api/portfolio/${id}/${endpoint}`;
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
