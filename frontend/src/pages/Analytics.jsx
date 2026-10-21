// TODO: wire up Peak Hours Heatmap, Revenue by Plan, Churn Risk, New vs
// Renewal and Cross-Gym Revenue widgets using useGymData and recharts.
const WIDGETS = [
  'Peak Hours Heatmap',
  'Revenue by Plan',
  'Churn Risk',
  'New vs Renewal',
  'Cross-Gym Revenue',
];

export default function Analytics() {
  return (
    <div>
      <h1>Analytics</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {WIDGETS.map((label) => (
          <div key={label} className="skeleton-card">
            <span style={{ color: 'var(--text-muted)' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
