import React, { useEffect, useState } from 'react';

import Container from '../components/Container';
import UsageChart from '../components/UsageChart';

import { pctZero } from '../utils/format';

import { FIFTEEN_MINUTES_IN_SECONDS } from '../constants';
import { IEXCloudUsageResponse } from '../types';

const AVAILABLE_CREDITS = 50000;

const Usage = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [creditUsage, setCreditUsage] = useState<IEXCloudUsageResponse>(null);

  useEffect(() => {
    setIsLoading(true);
    const fetchCreditUsage = async () => {
      const response = await fetch('/api/usage');
      const data = await response.json();
      setCreditUsage(data.creditUsage);
    };
    fetchCreditUsage().catch(console.error);
    setIsLoading(false);
    const interval = setInterval(fetchCreditUsage, FIFTEEN_MINUTES_IN_SECONDS * 1000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) return <p>Loading...</p>;
  if (!creditUsage) return <p>Data missing.</p>;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const { monthlyUsage } = creditUsage;

  const nonNullDailyUsage = Object.fromEntries(
    Object.entries(creditUsage.dailyUsage).map(([date, usage]) => [
      Number(date.slice(-2)),
      Number(usage),
    ])
  );
  const dailyUsage = [...Array(daysInMonth + 1).keys()]
    .slice(1)
    .map((elem) => ({ name: elem, usage: nonNullDailyUsage[elem] || 0 }));

  const currentMonth = now.toLocaleString('default', { month: 'long' });
  const daysSoFar = now.getDate();
  const projectedUsage = (monthlyUsage / daysSoFar) * daysInMonth;

  return (
    <Container>
      <h1>{`IEX Cloud credit usage in ${currentMonth}`}</h1>
      <p>{`Credits used: ${pctZero(monthlyUsage / AVAILABLE_CREDITS)}`}</p>
      <p>{`Monthly projection: ${pctZero(projectedUsage / AVAILABLE_CREDITS)}`}</p>
      <UsageChart data={dailyUsage} />
    </Container>
  );
};

export default Usage;
