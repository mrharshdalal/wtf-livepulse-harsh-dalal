import { Routes, Route, Link } from 'react-router-dom';
import useWebSocket from './hooks/useWebSocket';
import useStore from './store/useStore';
import Dashboard from './pages/Dashboard.jsx';
import Analytics from './pages/Analytics.jsx';
import Anomalies from './pages/Anomalies.jsx';

export default function App() {
  const { connected } = useWebSocket();
  const anomalyCount = useStore((state) => state.anomalyCount);

  return (
    <div>
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          padding: '12px 24px',
          background: 'var(--card)',
        }}
      >
        <strong>WTF LivePulse</strong>

        {/* TODO: populate with real gyms from /api/gyms */}
        <select disabled defaultValue="">
          <option value="">Loading gyms…</option>
        </select>

        <Link to="/">Dashboard</Link>
        <Link to="/analytics">Analytics</Link>
        <Link to="/anomalies">Anomalies</Link>

        {/* TODO: drive from useAnomalies count once implemented */}
        <span title="Active anomalies">⚠ {anomalyCount}</span>

        <span
          className={`status-dot ${connected ? 'connected' : 'disconnected'}`}
          title={connected ? 'Connected' : 'Disconnected'}
          style={{ marginLeft: 'auto' }}
        />
      </nav>

      <main style={{ padding: 24 }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/anomalies" element={<Anomalies />} />
        </Routes>
      </main>
    </div>
  );
}
