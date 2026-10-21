import { useState, useMemo } from 'react';
import AttentionRow from '../ui/AttentionRow';
import SkeletonCard from '../ui/SkeletonCard';
import ErrorState from '../ui/ErrorState';
import EmptyState from '../ui/EmptyState';
import SearchInput from '../ui/SearchInput';
import Pill from '../ui/Pill';
import Card from '../ui/Card';
import { formatRelativeTime, formatINR, shortGymName } from '../../lib/formatters';

const EVENT_ICON = {
  checkin: { icon: '↓', variant: 'ok' },
  checkout: { icon: '↑', variant: 'neutral' },
  payment: { icon: '₹', variant: 'accent' },
};
const EVENT_LABEL = { checkin: 'Check-ins', checkout: 'Check-outs', payment: 'Payments' };

function describeEvent(event) {
  if (event.event_type === 'payment') return `paid ${formatINR(event.amount)} · ${event.plan_type}`;
  if (event.event_type === 'checkin') return 'checked in';
  return 'checked out';
}

/** gymNameById: { [gymId]: gymName } -- live-pushed events only carry
 * gym_id, so the display name is always resolved through this lookup
 * rather than trusting the (sometimes absent) gym_name field. */
export default function ActivityFeed({ events, gymNameById, loading, error }) {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState(null);

  const filtered = useMemo(() => {
    let list = events;
    if (typeFilter) list = list.filter((e) => e.event_type === typeFilter);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((e) => {
        const gymName = (gymNameById[e.gym_id] || e.gym_name || '').toLowerCase();
        return e.member_name.toLowerCase().includes(q) || gymName.includes(q);
      });
    }
    return list;
  }, [events, query, typeFilter, gymNameById]);

  return (
    <Card>
      <div className="card-head">
        <div className="card-title">
          Live Activity <span className="badge-count">All Gyms</span>
        </div>
      </div>
      <div className="card-sub">Real-time check-ins, check-outs, and payments across every gym.</div>

      {error && <ErrorState message={error} />}
      {loading && !error && <SkeletonCard height={420} />}

      {!loading && !error && events.length > 0 && (
        <div className="card-toolbar">
          <SearchInput value={query} onChange={setQuery} placeholder="Search member or gym…" />
          <Pill active={typeFilter === null} onClick={() => setTypeFilter(null)}>
            All
          </Pill>
          {Object.entries(EVENT_LABEL).map(([key, label]) => (
            <Pill key={key} active={typeFilter === key} onClick={() => setTypeFilter(key)}>
              {label}
            </Pill>
          ))}
        </div>
      )}

      {!loading && !error && events.length === 0 && (
        <EmptyState title="No activity yet" description="Start the simulator to see live events here." />
      )}
      {!loading && !error && events.length > 0 && filtered.length === 0 && (
        <EmptyState title="No matching activity" description={query ? `Nothing matches "${query}"` : 'Try a different filter.'} />
      )}
      {!loading &&
        !error &&
        filtered.map((event, i) => {
          const { icon, variant } = EVENT_ICON[event.event_type] || EVENT_ICON.checkin;
          return (
            <AttentionRow
              key={`${event.event_type}-${event.event_time}-${i}`}
              icon={icon}
              variant={variant}
              title={event.member_name}
              desc={describeEvent(event)}
              pill={shortGymName(gymNameById[event.gym_id] || event.gym_name)}
              time={formatRelativeTime(event.event_time)}
            />
          );
        })}
    </Card>
  );
}
