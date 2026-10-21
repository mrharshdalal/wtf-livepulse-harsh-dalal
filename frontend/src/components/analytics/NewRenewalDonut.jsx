import { PieChart, Pie, Cell, Tooltip } from 'recharts';
import Card from '../ui/Card';
import SkeletonCard from '../ui/SkeletonCard';
import ErrorState from '../ui/ErrorState';

const COLORS = { new: '#6c5ce7', renewal: '#16a6c9' };
const LABELS = { new: 'New', renewal: 'Renewal' };

export default function NewRenewalDonut({ data, loading, error }) {
  if (loading) {
    return (
      <Card>
        <div className="card-title">New vs Renewal</div>
        <SkeletonCard />
      </Card>
    );
  }
  if (error) {
    return (
      <Card>
        <div className="card-title">New vs Renewal</div>
        <ErrorState message={error} />
      </Card>
    );
  }

  const total = data.reduce((sum, d) => sum + d.count, 0);
  const chartData = data.map((d) => ({ name: LABELS[d.payment_type] || d.payment_type, value: d.count, key: d.payment_type }));

  return (
    <Card>
      <div className="card-title">New vs Renewal</div>
      <div className="card-sub">Selected date range</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 28, justifyContent: 'center', padding: '6px 0' }}>
        <div style={{ position: 'relative', width: 150, height: 150 }}>
          <PieChart width={150} height={150}>
            <Pie
              data={chartData}
              dataKey="value"
              innerRadius={53}
              outerRadius={75}
              startAngle={90}
              endAngle={-270}
              stroke="none"
            >
              {chartData.map((entry) => (
                <Cell key={entry.key} fill={COLORS[entry.key] || '#999'} />
              ))}
            </Pie>
            <Tooltip formatter={(value, name) => [`${value} payments`, name]} />
          </PieChart>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 800 }}>{total}</div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              payments
            </div>
          </div>
        </div>
        <div className="donut-legend">
          {data.map((d) => (
            <div className="donut-legend-row" key={d.payment_type}>
              <span className="sw" style={{ background: COLORS[d.payment_type] }} />
              {LABELS[d.payment_type] || d.payment_type} <span className="cnt">({d.count})</span>
              <span className="pct">{total ? Math.round((d.count / total) * 100) : 0}%</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
