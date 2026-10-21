import { useState, useMemo } from 'react';
import useStore from '../store/useStore';
import useAnomalies from '../hooks/useAnomalies';
import useGymsList from '../hooks/useGymsList';
import Header from '../components/layout/Header';
import Card from '../components/ui/Card';
import AttentionRow from '../components/ui/AttentionRow';
import Modal from '../components/ui/Modal';
import Pill from '../components/ui/Pill';
import SkeletonCard from '../components/ui/SkeletonCard';
import ErrorState from '../components/ui/ErrorState';
import EmptyState from '../components/ui/EmptyState';
import SearchInput from '../components/ui/SearchInput';
import { formatRelativeTime, shortGymName } from '../lib/formatters';

const TYPE_LABEL = {
  zero_checkins: 'Zero Check-ins',
  capacity_breach: 'Capacity Breach',
  revenue_drop: 'Revenue Drop',
};
const TYPE_OPTIONS = Object.keys(TYPE_LABEL);

export default function Anomalies() {
  const severityFilter = useStore((s) => s.anomalySeverityFilter);
  const { anomalies, loading, error, dismiss } = useAnomalies({ severity: severityFilter });
  const { gyms } = useGymsList();
  const [pendingDismiss, setPendingDismiss] = useState(null);
  const [dismissError, setDismissError] = useState(null);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState(null);

  const gymNameById = Object.fromEntries(gyms.map((g) => [g.id, g.name]));
  const unresolvedCount = anomalies.filter((a) => !a.resolved).length;

  const filteredAnomalies = useMemo(() => {
    let list = anomalies;
    if (typeFilter) list = list.filter((a) => a.type === typeFilter);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((a) => {
        const gymName = (gymNameById[a.gym_id] || '').toLowerCase();
        return a.message.toLowerCase().includes(q) || gymName.includes(q) || (TYPE_LABEL[a.type] || a.type).toLowerCase().includes(q);
      });
    }
    return list;
  }, [anomalies, query, typeFilter, gymNameById]);

  const confirmDismiss = () => {
    if (!pendingDismiss) return;
    dismiss(pendingDismiss.id)
      .then(() => setPendingDismiss(null))
      .catch((err) => setDismissError(err.message));
  };

  return (
    <div>
      <Header
        breadcrumb="Anomalies"
        title="Anomalies"
        subtitle={`${unresolvedCount} active across all gyms. Resolved anomalies stay visible for 24 hours.`}
      />

      {error && <ErrorState message={error} />}
      {dismissError && <ErrorState message={dismissError} />}
      {loading && <SkeletonCard height={420} />}

      {!loading && !error && (
        <Card>
          <div className="card-toolbar">
            <SearchInput value={query} onChange={setQuery} placeholder="Search anomalies, gyms, or type…" />
            <Pill active={typeFilter === null} onClick={() => setTypeFilter(null)}>
              All types
            </Pill>
            {TYPE_OPTIONS.map((t) => (
              <Pill key={t} active={typeFilter === t} onClick={() => setTypeFilter(t)}>
                {TYPE_LABEL[t]}
              </Pill>
            ))}
          </div>
          {filteredAnomalies.length === 0 ? (
            <EmptyState
              title={query || typeFilter ? 'No matching anomalies' : 'No anomalies to show'}
              description={query ? `Nothing matches "${query}"` : 'Everything is running within normal thresholds.'}
            />
          ) : (
            filteredAnomalies.map((a) => (
              <AttentionRow
                key={a.id}
                icon="!"
                variant={a.resolved ? 'ok' : a.severity === 'critical' ? 'crit' : 'warn'}
                title={`${TYPE_LABEL[a.type] || a.type} — ${shortGymName(gymNameById[a.gym_id]) || 'Unknown gym'}`}
                desc={a.message}
                pill={a.resolved ? 'Resolved' : a.severity === 'critical' ? 'Critical' : 'Warning'}
                time={a.resolved ? formatRelativeTime(a.resolved_at) : formatRelativeTime(a.detected_at)}
                action={
                  !a.resolved
                    ? {
                        label: a.dismissed ? 'Dismissed' : 'Dismiss',
                        disabled: a.severity === 'critical' || a.dismissed,
                        onClick: () => {
                          setDismissError(null);
                          setPendingDismiss(a);
                        },
                      }
                    : undefined
                }
              />
            ))
          )}
        </Card>
      )}

      {pendingDismiss && (
        <Modal
          icon="!"
          iconVariant="warn"
          title="Dismiss this anomaly?"
          description={`This will mark "${pendingDismiss.message}" as dismissed. It stays in the record but won't be highlighted as active.`}
          cancelLabel="Cancel"
          confirmLabel="Dismiss"
          onCancel={() => setPendingDismiss(null)}
          onConfirm={confirmDismiss}
        />
      )}
    </div>
  );
}
