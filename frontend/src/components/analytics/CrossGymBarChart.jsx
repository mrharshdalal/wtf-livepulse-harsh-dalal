import Card from '../ui/Card';
import RankedBarList from '../ui/RankedBarList';
import SkeletonCard from '../ui/SkeletonCard';
import ErrorState from '../ui/ErrorState';
import { formatINR, shortGymName } from '../../lib/formatters';

export default function CrossGymBarChart({ data, loading, error }) {
  if (loading) {
    return (
      <Card>
        <div className="card-title">Cross-Gym Revenue</div>
        <SkeletonCard />
      </Card>
    );
  }
  if (error) {
    return (
      <Card>
        <div className="card-title">Cross-Gym Revenue</div>
        <ErrorState message={error} />
      </Card>
    );
  }

  const max = Math.max(1, ...data.map((d) => d.total_revenue));
  const items = data.map((d) => ({
    rank: d.rank,
    label: shortGymName(d.gym_name),
    displayValue: formatINR(d.total_revenue),
    pct: (d.total_revenue / max) * 100,
  }));

  return (
    <Card>
      <div className="card-title">Cross-Gym Revenue</div>
      <div className="card-sub">Ranked, last 30 days</div>
      <RankedBarList items={items} />
    </Card>
  );
}
