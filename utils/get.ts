import { fetchFn } from './fetch';

import { FIFTEEN_MINUTES_IN_SECONDS } from '../constants';

const get = async ({
  client,
  fetchFunction = fetchFn,
  URL,
  keyName,
  expiry = FIFTEEN_MINUTES_IN_SECONDS,
  fetchFnOptions = {},
  ignoreCurrentCache = false,
  logSanitiser = (URL) => URL,
}: {
  client;
  fetchFunction?: Function;
  URL: string;
  keyName: string;
  expiry?: number;
  fetchFnOptions?: object;
  ignoreCurrentCache?: boolean;
  logSanitiser?: Function;
}) => {
  let data;
  const redisData = await client.get(keyName);
  if (redisData && !ignoreCurrentCache) {
    data = JSON.parse(redisData);
  } else {
    data = await fetchFunction({ URL, options: fetchFnOptions, logSanitiser });
    if (data) {
      await client.set(keyName, JSON.stringify(data), {
        EX: expiry,
      });
    }
  }
  return data;
};

export default get;
