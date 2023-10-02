import type { NextApiRequest, NextApiResponse } from 'next';

import fetchTickerPrices from '../../utils/fetchTickerPrices';
import getAllTickersToQuery from '../../utils/getAllTickersToQuery';

const allTickerPrices = async (req: NextApiRequest, res: NextApiResponse) => {
  const { now, ignoreCurrentCache } = req.query;
  if (typeof now === 'string') {
    const allTickersToQuery = getAllTickersToQuery();
    const currentTickerPrices = await fetchTickerPrices(
      allTickersToQuery,
      ignoreCurrentCache === 'true'
    );
    res.status(200).json({ currentTickerPrices });
  }
};

export default allTickerPrices;
