import { Cell, Pie, PieChart } from 'recharts';

const display = (x: number) => Math.round(100 * x);

const APIUsage = ({
  title,
  currentPct,
  projectionPct,
}: {
  title: string;
  currentPct: number;
  projectionPct: number;
}) => {
  const currentFormatted = display(currentPct);
  const actual = [{ value: currentFormatted }, { value: 100 - currentFormatted }];

  const cappedProjectionPct = Math.min(projectionPct, 1);
  const projectionFormatted = display(cappedProjectionPct);
  const projection = [{ value: projectionFormatted }, { value: 100 - projectionFormatted }];

  return (
    <div style={{ border: '1px solid Gainsboro', width: '300px' }}>
      <PieChart width={300} height={150}>
        <Pie
          data={actual}
          dataKey="value"
          startAngle={180}
          endAngle={0}
          isAnimationActive={false}
          cx="50%"
          cy="100%"
          outerRadius={60}
          fill="#8884d8"
        >
          {actual.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={index === 0 ? '#008000' : 'transparent'} />
          ))}
        </Pie>
        <Pie
          data={projection}
          dataKey="value"
          startAngle={180}
          endAngle={0}
          isAnimationActive={false}
          cx="50%"
          cy="100%"
          innerRadius={70}
          outerRadius={90}
          fill="#82ca9d"
          label={({ value }) => `${value}%`}
        >
          {projection.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={index === 0 ? '#008000' : 'transparent'} />
          ))}
        </Pie>
      </PieChart>
      <span style={{ display: 'block', margin: '0.5rem auto 1rem', textAlign: 'center' }}>
        {title}
      </span>
    </div>
  );
};

export default APIUsage;
