import { fetchFn } from './fetch';

import { ONE_MINUTE_IN_SECONDS } from '../constants';

const get = async ({
  client,
  endpoint,
  keyName,
  expiry = ONE_MINUTE_IN_SECONDS,
  fetchFnOptions = {},
}: {
  client;
  endpoint: string;
  keyName: string;
  expiry?: number;
  fetchFnOptions?: object;
}) => {
  let data;
  const redisData = await client.get(keyName);
  if (redisData) {
    data = JSON.parse(redisData);
  } else {
    data = await fetchFn(endpoint, fetchFnOptions);
    await client.set(keyName, JSON.stringify(data), {
      EX: expiry,
    });
  }
  return data;
};

export default get;
