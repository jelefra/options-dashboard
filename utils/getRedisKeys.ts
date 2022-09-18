import { createClient } from 'redis';

const getRedisKeys = async (
  keys: string[]
): Promise<{
  [key: string]: number;
}> => {
  const redisKeysValues = await Promise.all(
    keys.map(async (key) => {
      const client = createClient();
      await client.connect();
      const redisData = await client.get(key);
      return { key, redisData };
    })
  );

  return redisKeysValues.reduce((accumulator, current) => {
    const { key, redisData } = current;
    accumulator[key] = redisData;
    return accumulator;
  }, {});
};

export default getRedisKeys;
