import React from 'react';
import { GetServerSideProps } from 'next';
import dynamic from 'next/dynamic';

import Container from '../components/Container';
import { pctZero } from '../utils/format';

const AVAILABLE_CREDITS = 50000;

export const getServerSideProps: GetServerSideProps = async () => {
  const endpoint = `https://cloud.iexapis.com/v1/account/usage/credits?token=${process.env.IEX_SECRET_KEY}`;
  const creditUsage = await fetch(endpoint).then((response) => response.json());

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

  return {
    props: { dailyUsage, monthlyUsage, daysInMonth },
  };
};

const UsageChart = dynamic(() => import('../components/UsageChart'), { ssr: false });

export default function Usage({ dailyUsage, monthlyUsage, daysInMonth }) {
  const now = new Date();
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
}
