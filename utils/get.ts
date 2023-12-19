import { createClient } from 'redis';

import { FIFTEEN_MINUTES_IN_SECONDS } from '../constants';
import { fetchFn } from './fetch';

export const getFromRedis = async (client: ReturnType<typeof createClient>, keyName: string) => {
  const data = await client.get(keyName);
  return data ? JSON.parse(data) : null;
};

type FetchAndStore = {
  client: ReturnType<typeof createClient>;
  fetchFunction?: Function;
  initialFetchDelay?: number;
  URL: string;
  keyName: string;
  expiry?: number;
  fetchFnOptions?: object;
  // eslint-disable-next-line no-unused-vars
  logSanitiser?: (input: string) => string;
};

export const fetchAndStore = async ({
  client,
  fetchFunction = fetchFn,
  initialFetchDelay = 0,
  URL,
  keyName,
  expiry = FIFTEEN_MINUTES_IN_SECONDS,
  fetchFnOptions = {},
  logSanitiser = (URL) => URL,
}: FetchAndStore) => {
  await new Promise((resolve) => setTimeout(resolve, initialFetchDelay));
  const data = await fetchFunction({ URL, options: fetchFnOptions, logSanitiser });
  if (data) {
    await client.set(keyName, JSON.stringify(data), {
      EX: expiry,
    });
  }
  return data;
};

const get = async ({
  client,
  fetchFunction = fetchFn,
  initialFetchDelay = 0,
  URL,
  keyName,
  expiry = FIFTEEN_MINUTES_IN_SECONDS,
  fetchFnOptions = {},
  ignoreCurrentCache = false,
  logSanitiser = (URL) => URL,
}: FetchAndStore & { ignoreCurrentCache?: boolean }) => {
  const redisData = await getFromRedis(client, keyName);
  if (redisData && !ignoreCurrentCache) {
    return redisData;
  } else {
    return fetchAndStore({
      client,
      fetchFunction,
      initialFetchDelay,
      URL,
      keyName,
      expiry,
      fetchFnOptions,
      logSanitiser,
    });
  }
};

export default get;
