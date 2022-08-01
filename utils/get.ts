import { Dayjs } from 'dayjs';

import { ONE_MINUTE_IN_SECONDS } from '../constants';

import { RedisKey } from '../types';

const get = async ({
  client,
  fetchFn,
  keyName,
  now = undefined,
  expiry = ONE_MINUTE_IN_SECONDS,
}: {
  client;
  fetchFn: Function;
  keyName: RedisKey;
  now?: Dayjs;
  expiry?: number;
}) => {
  let data;
  const redisData = await client.get(keyName);
  if (redisData) {
    data = JSON.parse(redisData);
  } else {
    data = await fetchFn(now);
    await client.set(keyName, JSON.stringify(data), {
      EX: expiry,
    });
  }
  return data;
};

export default get;
