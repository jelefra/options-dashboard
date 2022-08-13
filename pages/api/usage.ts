import { fetchFn } from '../../utils/fetch';
import type { NextApiRequest, NextApiResponse } from 'next';

const creditUsage = async (req: NextApiRequest, res: NextApiResponse) => {
  const endpoint = `https://cloud.iexapis.com/v1/account/usage/credits?token=${process.env.IEX_SECRET_KEY}`;
  const creditUsage = await fetchFn({ endpoint });
  res.status(200).json({ creditUsage });
};

export default creditUsage;
