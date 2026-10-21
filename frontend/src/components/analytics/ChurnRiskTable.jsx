import { useState, useMemo } from 'react';
import Card from '../ui/Card';
import StatusBadge from '../ui/StatusBadge';
import SkeletonCard from '../ui/SkeletonCard';
import ErrorState from '../ui/ErrorState';
import EmptyState from '../ui/EmptyState';
import SearchInput from '../ui/SearchInput';
import Pill from '../ui/Pill';

const VISIBLE_ROWS = 8;

function daysAgo(iso) {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  return `${days} days ago`;
}

export default function ChurnRiskTable({ data, loading, error, gymName }) {
  const [query, setQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState(null);

  const filtered = useMemo(() => {
    let list = data;
    if (riskFilter) list = list.filter((m) => m.risk_level === riskFilter);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((m) => m.name.toLowerCase().includes(q));
    }
    return list;
  }, [data, query, riskFilter]);

  if (loading) {
    return (
      <Card>
        <div className="card-title">Churn Risk</div>
        <SkeletonCard />
      </Card>
    );
  }
  if (error) {
    return (
      <Card>
        <div className="card-title">Churn Risk</div>
        <ErrorState message={error} />
      </Card>
    );
  }

  return (
    <Card>
      <div className="card-head">
        <div className="card-title">Churn Risk</div>
        <span className="table-toggle">{data.length} members</span>
      </div>
      <div className="card-sub">{gymName} · no check-in in 45+ days</div>

      {data.length > 0 && (
        <div className="card-toolbar">
          <SearchInput value={query} onChange={setQuery} placeholder="Search members…" />
          <Pill active={riskFilter === null} onClick={() => setRiskFilter(null)}>
            All
          </Pill>
          <Pill active={riskFilter === 'high'} onClick={() => setRiskFilter('high')}>
            High
          </Pill>
          <Pill active={riskFilter === 'critical'} onClick={() => setRiskFilter('critical')}>
            Critical
          </Pill>
        </div>
      )}

      {data.length === 0 ? (
        <EmptyState title="No at-risk members" description="Everyone has checked in within the last 45 days." />
      ) : filtered.length === 0 ? (
        <EmptyState title="No matching members" description={query ? `Nothing matches "${query}"` : 'Try a different filter.'} />
      ) : (
        <>
          <table className="data-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Last Check-in</th>
                <th>Risk</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, VISIBLE_ROWS).map((m) => (
                <tr key={m.id}>
                  <td>{m.name}</td>
                  <td>{daysAgo(m.last_checkin_at)}</td>
                  <td>
                    <StatusBadge variant={m.risk_level === 'critical' ? 'critical' : 'warning'}>
                      {m.risk_level.toUpperCase()}
                    </StatusBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > VISIBLE_ROWS && (
            <div style={{ fontSize: 11, color: 'var(--text-faint)', textAlign: 'center', paddingTop: 12 }}>
              Showing {VISIBLE_ROWS} of {filtered.length} at-risk members
            </div>
          )}
        </>
      )}
    </Card>
  );
}
