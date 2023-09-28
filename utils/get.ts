import { FIFTEEN_MINUTES_IN_SECONDS } from '../constants';
import { fetchFn } from './fetch';

export const getFromRedis = async (client, keyName) => {
  const data = await client.get(keyName);
  return data ? JSON.parse(data) : null;
};

type FetchAndStore = {
  client;
  fetchFunction?: Function;
  initialFetchDelay?: number;
  URL: string;
  keyName: string;
  expiry?: number;
  fetchFnOptions?: object;
  logSanitiser?: Function;
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
