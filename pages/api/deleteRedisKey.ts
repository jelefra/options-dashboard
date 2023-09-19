import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from 'redis';

const deleteRedisKey = async (req: NextApiRequest, res: NextApiResponse) => {
  const client = createClient();
  await client.connect();
  const { key } = req.query;
  await client.del(key);
  res.status(200).json({});
};

export default deleteRedisKey;
