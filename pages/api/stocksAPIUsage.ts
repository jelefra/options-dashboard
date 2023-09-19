import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from 'redis';

import { sanitiseIEXLogs } from '../../utils';
import get from '../../utils/get';

const stocksAPIUsage = async (req: NextApiRequest, res: NextApiResponse) => {
  const client = createClient();
  await client.connect();
  const URL = `https://cloud.iexapis.com/v1/account/usage/credits?token=${process.env.IEX_SECRET_KEY}`;
  const response = await get({
    client,
    URL,
    keyName: 'stocksAPIUsage',
    logSanitiser: sanitiseIEXLogs,
  });
  res.status(200).json({ usage: response });
};

export default stocksAPIUsage;
