import Card from '../ui/Card';
import SkeletonCard from '../ui/SkeletonCard';
import ErrorState from '../ui/ErrorState';
import { formatINR } from '../../lib/formatters';

const PLAN_ORDER = ['monthly', 'quarterly', 'annual'];
const PLAN_LABEL = { monthly: 'Monthly', quarterly: 'Quarterly', annual: 'Annual' };
const PLAN_COLOR = { monthly: 'var(--accent)', quarterly: 'var(--series-2)', annual: 'var(--series-3)' };

export default function RevenueByPlanChart({ data, loading, error }) {
  if (loading) {
    return (
      <Card>
        <div className="card-title">Revenue by Plan Type</div>
        <SkeletonCard />
      </Card>
    );
  }
  if (error) {
    return (
      <Card>
        <div className="card-title">Revenue by Plan Type</div>
        <ErrorState message={error} />
      </Card>
    );
  }

  const byType = Object.fromEntries(data.map((d) => [d.plan_type, d]));
  const max = Math.max(1, ...PLAN_ORDER.map((p) => byType[p]?.revenue || 0));

  return (
    <Card>
      <div className="card-title">Revenue by Plan Type</div>
      <div className="card-sub">Selected date range</div>
      {PLAN_ORDER.map((plan) => {
        const revenue = byType[plan]?.revenue || 0;
        return (
          <div className="bar-row" key={plan}>
            <div className="bar-label">{PLAN_LABEL[plan]}</div>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${(revenue / max) * 100}%`, background: PLAN_COLOR[plan] }} />
            </div>
            <div className="bar-value">{formatINR(revenue)}</div>
          </div>
        );
      })}
    </Card>
  );
}
