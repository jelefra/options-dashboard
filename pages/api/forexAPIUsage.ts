import { createClient } from 'redis';
import type { NextApiRequest, NextApiResponse } from 'next';

import get from '../../utils/get';
import { sanitiseOpenExchangeRatesLogs } from '../../utils';

const forexAPIUsage = async (req: NextApiRequest, res: NextApiResponse) => {
  const client = createClient();
  await client.connect();
  const URL = `https://openexchangerates.org/api/usage.json?app_id=${process.env.OPEN_EXCHANGE_RATES_APP_ID}`;
  const response = await get({
    client,
    URL,
    keyName: 'forexAPIUsage',
    logSanitiser: sanitiseOpenExchangeRatesLogs,
  });
  res.status(200).json({ usage: response.data.usage });
};

export default forexAPIUsage;
