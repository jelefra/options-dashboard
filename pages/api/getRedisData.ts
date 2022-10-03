import { createClient } from 'redis';
import type { NextApiRequest, NextApiResponse } from 'next';

const getRedisData = async (req: NextApiRequest, res: NextApiResponse) => {
  const { keys: keysParam } = req.query;
  if (typeof keysParam === 'string') {
    const keys = keysParam.split(',');

    const redisKeyValuePairs = await Promise.all(
      keys.map(async (key) => {
        const client = createClient();
        await client.connect();
        const value = await client.get(key);
        return { key, value };
      })
    );

    const values = redisKeyValuePairs.reduce((accumulator, current) => {
      const { key, value } = current;
      accumulator[key] = value;
      return accumulator;
    }, {});

    res.status(200).json({ values });
  }
};

export default getRedisData;
