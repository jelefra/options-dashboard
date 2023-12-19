import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from 'redis';

const getRedisKeys = async (req: NextApiRequest, res: NextApiResponse) => {
  const { keys: keysParam } = req.query;
  if (typeof keysParam === 'string') {
    const keys = keysParam.split(',');
    const client = createClient();
    await client.connect();

    const redisKeyValuePairs = await Promise.all(
      keys.map(async (key) => {
        const value = await client.get(key);
        return { key, value: JSON.parse(value) };
      })
    );

    const values = redisKeyValuePairs.reduce((accumulator: { [key: string]: any }, current) => {
      const { key, value } = current;
      accumulator[key] = value;
      return accumulator;
    }, {});

    res.status(200).json({ values });
  }
};

export default getRedisKeys;
