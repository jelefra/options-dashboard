import { OpenExchangeRatesUsage } from '../types';
import APIUsage from './APIUsage';

const ForexAPIUsage = ({ usage }: { usage: OpenExchangeRatesUsage }) => {
  const { requests, requests_quota, days_elapsed, days_remaining } = usage;
  const currentPct = requests / requests_quota;
  // days_elapsed = 0 on the first day of the cycle
  const projectionPct = (currentPct / (days_elapsed + 1)) * (days_elapsed + days_remaining);

  return (
    <APIUsage
      title="Forex API usage"
      currentPct={currentPct}
      projectionPct={projectionPct}
      daysRemaining={days_remaining}
    />
  );
};

export default ForexAPIUsage;
