import { useEffect, useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import useGymsList from '../../hooks/useGymsList';
import useStore from '../../store/useStore';
import Pill from '../ui/Pill';
import ErrorState from '../ui/ErrorState';
import EmptyState from '../ui/EmptyState';
import { SearchIcon } from './icons';

function occupancyColor(gym) {
  if (!gym.capacity) return 'var(--text-faint)';
  const pct = gym.current_occupancy / gym.capacity;
  if (pct > 0.85) return 'var(--crit)';
  if (pct >= 0.6) return 'var(--warn)';
  return 'var(--ok)';
}

export default function SidePanel() {
  const location = useLocation();
  const { gyms, loading, error } = useGymsList();
  const selectedGymId = useStore((s) => s.selectedGymId);
  const setSelectedGymId = useStore((s) => s.setSelectedGymId);
  const anomalySeverityFilter = useStore((s) => s.anomalySeverityFilter);
  const setAnomalySeverityFilter = useStore((s) => s.setAnomalySeverityFilter);
  const [query, setQuery] = useState('');

  const isAnomaliesRoute = location.pathname.startsWith('/anomalies');

  // Default to the first gym once the list loads, so pages aren't stuck
  // with no selection on first load.
  useEffect(() => {
    if (!selectedGymId && gyms.length > 0) {
      setSelectedGymId(gyms[0].id);
    }
  }, [gyms, selectedGymId, setSelectedGymId]);

  const filteredGyms = useMemo(() => {
    if (!query.trim()) return gyms;
    const q = query.trim().toLowerCase();
    return gyms.filter((g) => g.name.toLowerCase().includes(q) || g.city.toLowerCase().includes(q));
  }, [gyms, query]);

  return (
    <aside className="side-panel">
      {isAnomaliesRoute && (
        <>
          <div className="side-panel-title">Severity</div>
          <div className="side-panel-filters">
            <Pill active={anomalySeverityFilter === null} onClick={() => setAnomalySeverityFilter(null)}>
              All
            </Pill>
            <Pill active={anomalySeverityFilter === 'critical'} onClick={() => setAnomalySeverityFilter('critical')}>
              Critical
            </Pill>
            <Pill active={anomalySeverityFilter === 'warning'} onClick={() => setAnomalySeverityFilter('warning')}>
              Warning
            </Pill>
          </div>
        </>
      )}

      <div className="side-panel-title">Gyms</div>
      <div className="side-panel-search">
        <SearchIcon />
        <input
          type="text"
          placeholder="Search gyms or cities…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {loading && <div style={{ padding: '0 8px', fontSize: 12, color: 'var(--text-muted)' }}>Loading…</div>}
      {error && !loading && (
        <div style={{ padding: '0 8px' }}>
          <ErrorState message="Couldn't load gyms." />
        </div>
      )}
      {!loading && !error && filteredGyms.length === 0 && (
        <EmptyState title="No gyms found" description={`Nothing matches "${query}"`} />
      )}
      {filteredGyms.map((gym) => (
        <button
          key={gym.id}
          type="button"
          className={`gym-nav-row ${gym.id === selectedGymId ? 'active' : ''}`.trim()}
          onClick={() => setSelectedGymId(gym.id)}
        >
          <span className="gym-nav-dot" style={{ background: occupancyColor(gym) }} />
          <span className="gym-nav-main">
            <div className="gym-nav-name">{gym.name.replace('WTF Gyms — ', '')}</div>
            <div className="gym-nav-detail">
              {gym.current_occupancy}/{gym.capacity}
            </div>
          </span>
        </button>
      ))}
    </aside>
  );
}
