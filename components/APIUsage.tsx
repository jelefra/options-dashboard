import { Cell, Pie, PieChart } from 'recharts';

const display = (x: number) => Math.round(100 * x);

const APIUsage = ({
  title,
  currentPct,
  projectionPct,
  daysRemaining,
}: {
  title: string;
  currentPct: number;
  projectionPct: number;
  daysRemaining: number;
}) => {
  const currentFormatted = display(currentPct);
  const actual = [{ value: currentFormatted }, { value: 100 - currentFormatted }];

  const cappedProjectionPct = Math.min(projectionPct, 1);
  const cappedProjectionFormatted = display(cappedProjectionPct);
  const projectionFormatted = display(projectionPct);
  const projection = [
    { value: cappedProjectionFormatted, projectionFormatted },
    { value: 100 - cappedProjectionFormatted },
  ];

  const warn =
    (projectionPct > 1 && projectionPct < 3 && daysRemaining > 15) ||
    (projectionPct > 0.8 && projectionPct < 1 && daysRemaining <= 15);
  const alert = projectionPct > 1 && daysRemaining <= 15;

  return (
    <div
      style={{
        border: '1px solid Gainsboro',
        width: '300px',
        margin: '1rem',
        display: 'inline-block',
      }}
    >
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
            <Cell key={`cell-${index}`} fill={index === 0 ? 'Gainsboro' : 'transparent'} />
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
          label={({ projectionFormatted }) => `${projectionFormatted}%`}
        >
          {projection.map((entry, index) => {
            const fill = alert ? 'red' : warn ? 'orange' : 'green';
            return <Cell key={`cell-${index}`} fill={index === 0 ? fill : 'transparent'} />;
          })}
        </Pie>
      </PieChart>
      <span style={{ display: 'block', margin: '0.5rem auto 1rem', textAlign: 'center' }}>
        {title}
      </span>
    </div>
  );
};

export default APIUsage;
