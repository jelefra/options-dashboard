import { createClient } from 'redis';
import type { NextApiRequest, NextApiResponse } from 'next';

const deleteRedisKey = async (req: NextApiRequest, res: NextApiResponse) => {
  const client = createClient();
  await client.connect();
  const { key } = req.query;
  await client.del(key);
  res.status(200).json({});
};

export default deleteRedisKey;
