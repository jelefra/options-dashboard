import { createClient } from 'redis';
import type { NextApiRequest, NextApiResponse } from 'next';

import { ONE_HOUR_IN_SECONDS } from '../../constants';

const setRedisKey = async (req: NextApiRequest, res: NextApiResponse) => {
  const client = createClient();
  await client.connect();
  const { name, value } = req.body;
  await client.set(name, value, {
    EX: ONE_HOUR_IN_SECONDS,
  });
  res.status(200).json({});
};

export default setRedisKey;
