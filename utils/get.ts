import { fetchFn } from './fetch';

import { ONE_MINUTE_IN_SECONDS } from '../constants';

const get = async ({
  client,
  URL,
  keyName,
  expiry = ONE_MINUTE_IN_SECONDS,
  fetchFnOptions = {},
  ignoreCurrentCache = false,
}: {
  client;
  URL: string;
  keyName: string;
  expiry?: number;
  fetchFnOptions?: object;
  ignoreCurrentCache?: boolean;
}) => {
  let data;
  const redisData = await client.get(keyName);
  if (redisData && !ignoreCurrentCache) {
    data = JSON.parse(redisData);
  } else {
    data = await fetchFn(URL, fetchFnOptions);
    await client.set(keyName, JSON.stringify(data), {
      EX: expiry,
    });
  }
  return data;
};

export default get;
