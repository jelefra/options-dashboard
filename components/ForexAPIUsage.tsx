import { OpenExchangeRatesUsage } from '../types';

import { pctZero } from '../utils/format';

const ForexAPIUsage = ({ usage }: { usage: OpenExchangeRatesUsage }) => {
  const { requests, requests_quota, days_elapsed, days_remaining } = usage;
  const currentUsage = requests / requests_quota;
  // days_elapsed = 0 on the first day of the cycle
  const expectedFinalUsage = (currentUsage / (days_elapsed + 1)) * (days_remaining - 1);
  return (
    <>
      <p>Forex API usage</p>
      <ul>
        <li>{`Current usage: ${pctZero(currentUsage)}`}</li>
        <li>{`Expected final usage: ${pctZero(expectedFinalUsage)}`}</li>
      </ul>
    </>
  );
};

export default ForexAPIUsage;
