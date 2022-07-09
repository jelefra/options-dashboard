import { ONE_MINUTE_IN_SECONDS } from '../constants/constants';

const get = async (client, fetchFunction, keyName, expiry = ONE_MINUTE_IN_SECONDS) => {
  let data;
  const redisData = await client.get(keyName);
  if (redisData) {
    data = JSON.parse(redisData);
  } else {
    data = await fetchFunction();
    await client.set(keyName, JSON.stringify(data), {
      EX: expiry,
    });
  }
  return data;
};

export default get;
