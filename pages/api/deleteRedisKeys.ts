import { createClient } from 'redis';
import type { NextApiRequest, NextApiResponse } from 'next';

const deleteRedisKeys = async (req: NextApiRequest, res: NextApiResponse) => {
  const { keys: keysParam } = req.query;
  if (typeof keysParam === 'string') {
    const keys = keysParam.split(',');
    const client = createClient();
    await client.connect();

    await Promise.all(
      keys.map(async (key) => {
        await client.del(key);
      })
    );

    res.status(200).json({});
  }
};

export default deleteRedisKeys;
