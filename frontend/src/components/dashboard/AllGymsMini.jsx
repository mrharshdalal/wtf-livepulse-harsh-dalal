import Card from '../ui/Card';
import useStore from '../../store/useStore';
import useCountUp from '../../hooks/useCountUp';
import { formatINR, shortGymName } from '../../lib/formatters';

function occupancyColor(gym) {
  if (!gym.capacity) return 'var(--text-faint)';
  const pct = (gym.current_occupancy / gym.capacity) * 100;
  if (pct > 85) return 'var(--crit)';
  if (pct >= 60) return 'var(--warn)';
  return 'var(--ok)';
}

function initials(name) {
  return shortGymName(name)
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/** Also carries the S-06 all-gym summary row (Total Checked In / Today's
 * Revenue / Active Anomalies) -- visible without switching gyms. */
export default function AllGymsMini({ gyms }) {
  const anomalyCount = useStore((s) => s.anomalyCount);
  const totalCheckedIn = gyms.reduce((sum, g) => sum + (g.current_occupancy || 0), 0);
  const totalRevenue = gyms.reduce((sum, g) => sum + (Number(g.today_revenue) || 0), 0);

  const animatedCheckedIn = Math.round(useCountUp(totalCheckedIn));
  const animatedRevenue = useCountUp(totalRevenue);

  return (
    <Card>
      <div className="card-title">All Gyms</div>
      <div className="card-sub">Live occupancy by location</div>

      <div className="summary-row">
        <div className="summary-stat">
          <div className="n">{animatedCheckedIn}</div>
          <div className="l">Checked In</div>
        </div>
        <div className="summary-stat">
          <div className="n">{formatINR(animatedRevenue)}</div>
          <div className="l">Revenue Today</div>
        </div>
        <div className="summary-stat">
          <div className="n" style={{ color: anomalyCount > 0 ? 'var(--crit)' : 'var(--text)' }}>
            {anomalyCount}
          </div>
          <div className="l">Anomalies</div>
        </div>
      </div>

      {gyms.map((gym) => {
        const pct = gym.capacity ? Math.min(100, (gym.current_occupancy / gym.capacity) * 100) : 0;
        const color = occupancyColor(gym);
        return (
          <div className="gym-mini-row" key={gym.id}>
            <div className="gym-mini-avatar" style={{ background: color }}>
              {initials(gym.name)}
            </div>
            <div className="gym-mini-main">
              <div className="gym-mini-name">{shortGymName(gym.name)}</div>
              <div className="gym-mini-detail">
                {gym.current_occupancy} / {gym.capacity}
              </div>
            </div>
            <div className="gym-mini-bar">
              <div style={{ width: `${pct}%`, background: color }} />
            </div>
          </div>
        );
      })}
    </Card>
  );
}
