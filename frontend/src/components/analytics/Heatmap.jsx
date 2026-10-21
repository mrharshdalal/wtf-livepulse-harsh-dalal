import Card from '../ui/Card';
import SkeletonCard from '../ui/SkeletonCard';
import ErrorState from '../ui/ErrorState';

const DISPLAY_DAYS = [
  { label: 'Mon', dow: 1 },
  { label: 'Tue', dow: 2 },
  { label: 'Wed', dow: 3 },
  { label: 'Thu', dow: 4 },
  { label: 'Fri', dow: 5 },
  { label: 'Sat', dow: 6 },
  { label: 'Sun', dow: 0 },
];

const RAMP = ['#f1f0f7', '#e0dbfa', '#cdc2f8', '#bcaef5', '#a593f1', '#8a76ed', '#6c5ce7', '#5440c9'];

function colorFor(value, max) {
  if (!max || value <= 0) return RAMP[0];
  const ratio = value / max;
  const idx = Math.min(RAMP.length - 1, 1 + Math.floor(ratio * (RAMP.length - 2)));
  return RAMP[idx];
}

export default function Heatmap({ data, loading, error }) {
  if (loading) {
    return (
      <Card>
        <div className="card-title">Peak Hours Heatmap</div>
        <SkeletonCard height={260} />
      </Card>
    );
  }
  if (error) {
    return (
      <Card>
        <div className="card-title">Peak Hours Heatmap</div>
        <ErrorState message={error} />
      </Card>
    );
  }

  const grid = {};
  let max = 0;
  for (const row of data) {
    grid[`${row.day_of_week}-${row.hour_of_day}`] = row.checkin_count;
    if (row.checkin_count > max) max = row.checkin_count;
  }

  return (
    <Card>
      <div className="card-head">
        <div className="card-title">Peak Hours Heatmap</div>
        <button type="button" className="table-toggle">
          ⊞ Table view
        </button>
      </div>
      <div className="card-sub">Check-ins by hour of day, last 7 days.</div>
      <div className="heatmap-wrap">
        <div className="heatmap-days">
          <span style={{ height: 13 }} />
          {DISPLAY_DAYS.map((d) => (
            <span key={d.dow}>{d.label}</span>
          ))}
        </div>
        <div className="heatmap-grid">
          <div className="heatmap-hours">
            {Array.from({ length: 24 }, (_, h) => (
              <span key={h}>{h % 3 === 0 ? h : ''}</span>
            ))}
          </div>
          {DISPLAY_DAYS.map((d) => (
            <div className="heatmap-row" key={d.dow}>
              {Array.from({ length: 24 }, (_, h) => {
                const v = grid[`${d.dow}-${h}`] || 0;
                return <div key={h} className="hcell" title={`${v} check-ins`} style={{ background: colorFor(v, max) }} />;
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="heatmap-legend">
        Fewer check-ins
        <div className="ramp">
          {RAMP.slice(0, 5).map((c, i) => (
            <div key={i} style={{ background: c }} />
          ))}
        </div>
        More check-ins
      </div>
    </Card>
  );
}
