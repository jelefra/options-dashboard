import APIUsage from './APIUsage';

import { IEXCloudUsageResponse } from '../types';

const AVAILABLE_CREDITS = 50000;

const ForexAPIUsage = ({ usage }: { usage: IEXCloudUsageResponse }) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysElapsed = now.getDate();

  const { monthlyUsage } = usage;

  const currentPct = monthlyUsage / AVAILABLE_CREDITS;
  const projectionPct = (monthlyUsage * daysInMonth) / (AVAILABLE_CREDITS * daysElapsed);
  const daysRemaining = daysInMonth - daysElapsed;

  return (
    <APIUsage
      title="Stocks API usage"
      currentPct={currentPct}
      projectionPct={projectionPct}
      daysRemaining={daysRemaining}
    />
  );
};

export default ForexAPIUsage;
