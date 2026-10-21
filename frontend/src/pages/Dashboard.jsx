// TODO: wire up Occupancy, Today's Revenue, Activity Feed, All-Gym Summary
// and Simulator Controls widgets using useGymData / useWebSocket.
const WIDGETS = [
  'Occupancy',
  "Today's Revenue",
  'Activity Feed',
  'All-Gym Summary',
  'Simulator Controls',
];

export default function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
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
