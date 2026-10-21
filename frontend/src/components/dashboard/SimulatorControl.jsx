import { useState, useCallback } from 'react';
import Card from '../ui/Card';
import ErrorState from '../ui/ErrorState';
import { apiPost } from '../../lib/api';

const SPEEDS = [1, 5, 10];

export default function SimulatorControl() {
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const start = useCallback((s) => {
    setBusy(true);
    setError(null);
    apiPost('/api/simulator/start', { speed: s })
      .then((res) => {
        setRunning(true);
        setSpeed(res.speed);
      })
      .catch((err) => setError(err.message))
      .finally(() => setBusy(false));
  }, []);

  const stop = useCallback(() => {
    setBusy(true);
    setError(null);
    apiPost('/api/simulator/stop')
      .then(() => setRunning(false))
      .catch((err) => setError(err.message))
      .finally(() => setBusy(false));
  }, []);

  const reset = useCallback(() => {
    setBusy(true);
    setError(null);
    apiPost('/api/simulator/reset')
      .then(() => setRunning(false))
      .catch((err) => setError(err.message))
      .finally(() => setBusy(false));
  }, []);

  return (
    <Card>
      <div className="card-title">Simulator Control</div>
      <div className="card-sub">{running ? 'Generating live events' : 'Paused'}</div>
      {error && <ErrorState message={error} />}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {running ? (
          <button type="button" className="btn filled" disabled={busy} onClick={stop}>
            ⏸ Pause
          </button>
        ) : (
          <button type="button" className="btn filled" disabled={busy} onClick={() => start(speed)}>
            ▶ Start
          </button>
        )}
        <button type="button" className="btn ghost" disabled={busy} onClick={reset}>
          ↺ Reset
        </button>
      </div>
      <div className="speed-row">
        {SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            className={`speed-chip ${speed === s ? 'active' : ''}`.trim()}
            disabled={busy}
            onClick={() => {
              setSpeed(s);
              if (running) start(s);
            }}
          >
            {s}x
          </button>
        ))}
      </div>
    </Card>
  );
}
