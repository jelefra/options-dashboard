import React from 'react';
import { CartesianGrid, Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';

export default function UsageChart({ data }) {
  return (
    <ResponsiveContainer width="100%" minHeight={380}>
      <BarChart
        width={1000}
        height={380}
        data={data}
        margin={{
          top: 30,
          right: 0,
          left: 0,
          bottom: 0,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Bar type="monotone" dataKey="usage" fill="#777777" />
      </BarChart>
    </ResponsiveContainer>
  );
}
