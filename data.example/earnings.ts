import type { EarningsDates } from '../types';
import { setDate } from '../utils';

const earnings: EarningsDates = {
  AAPL: { date: setDate('27/10/2022'), confirmed: true, timing: 'After' },
  GOOG: { date: setDate('25/10/2022'), confirmed: false, timing: 'Before' },
};

export default earnings;
