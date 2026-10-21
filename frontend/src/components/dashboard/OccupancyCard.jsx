import Card from '../ui/Card';
import SegmentedBar from '../ui/SegmentedBar';
import useCountUp from '../../hooks/useCountUp';

export default function OccupancyCard({ gymName, capacity, occupancy }) {
  const animatedOccupancy = Math.round(useCountUp(occupancy));
  const pct = capacity ? (occupancy / capacity) * 100 : 0;
  const band = pct > 85 ? 'crit' : pct >= 60 ? 'warn' : 'ok';
  const bandColor = { crit: 'var(--crit)', warn: 'var(--warn)', ok: 'var(--ok)' }[band];
  const bandNote = { crit: '— critical threshold', warn: '— approaching capacity', ok: '' }[band];

  return (
    <Card>
      <div className="card-title">Live Occupancy</div>
      <div className="card-sub">
        {gymName} · {capacity} capacity
      </div>
      <div className="seg-number" style={{ color: bandColor }}>
        {animatedOccupancy}
      </div>
      <div className="seg-sub">
        {pct.toFixed(1)}% full {bandNote}
      </div>
      {/* Single real fill segment (not decorative zones) -- track width
          represents the actual live occupancy percentage. */}
      <SegmentedBar
        segments={[{ width: Math.min(100, pct), color: bandColor }]}
        legend={[
          { label: '<60%', color: 'var(--ok)' },
          { label: '60–85%', color: 'var(--warn)' },
          { label: '>85%', color: 'var(--crit)' },
        ]}
      />
    </Card>
  );
}
