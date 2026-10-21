import { useEffect, useState, useCallback } from 'react';
import { apiGet, apiPatch } from '../lib/api';
import { useWebSocketContext } from './WebSocketProvider';
import useStore from '../store/useStore';

/**
 * Fetches GET /api/anomalies (optionally filtered) and keeps the list live
 * via ANOMALY_DETECTED/ANOMALY_RESOLVED. `gym_name` is intentionally NOT
 * resolved here -- the backend's list endpoint doesn't join it, so callers
 * combine this hook's output with `useGymsList` to resolve names
 * consistently regardless of whether an anomaly arrived via the initial
 * fetch or a live WebSocket event.
 *
 * `updatesGlobalCount`: only the single unfiltered instance mounted at the
 * app shell should own `useStore.anomalyCount` (the rail badge). Multiple
 * instances with different filters (e.g. this page's own severity-filtered
 * call) must NOT also write to it -- whichever instance's effect fired
 * last would silently overwrite the real total with its own filtered
 * subset. Defaults to false; the shell passes true explicitly.
 */
export default function useAnomalies({ gymId = null, severity = null, updatesGlobalCount = false } = {}) {
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { subscribe } = useWebSocketContext();
  const setAnomalyCount = useStore((s) => s.setAnomalyCount);

  const refetch = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (gymId) params.set('gym_id', gymId);
    if (severity) params.set('severity', severity);
    const qs = params.toString();
    return apiGet(`/api/anomalies${qs ? `?${qs}` : ''}`)
      .then((data) => {
        setAnomalies(data);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [gymId, severity]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    if (!updatesGlobalCount) return;
    setAnomalyCount(anomalies.filter((a) => !a.resolved).length);
  }, [anomalies, updatesGlobalCount, setAnomalyCount]);

  useEffect(() => {
    const onDetected = (msg) => {
      if (gymId && msg.gym_id !== gymId) return;
      if (severity && msg.severity !== severity) return;
      setAnomalies((prev) => [
        {
          id: msg.anomaly_id,
          gym_id: msg.gym_id,
          type: msg.anomaly_type,
          severity: msg.severity,
          message: msg.message,
          resolved: false,
          dismissed: false,
          detected_at: new Date().toISOString(),
          resolved_at: null,
        },
        ...prev,
      ]);
    };

    const onResolved = (msg) => {
      setAnomalies((prev) =>
        prev.map((a) => (a.id === msg.anomaly_id ? { ...a, resolved: true, resolved_at: msg.resolved_at } : a))
      );
    };

    const unsubDetected = subscribe('ANOMALY_DETECTED', onDetected);
    const unsubResolved = subscribe('ANOMALY_RESOLVED', onResolved);
    return () => {
      unsubDetected();
      unsubResolved();
    };
  }, [gymId, severity, subscribe]);

  const dismiss = useCallback((id) => {
    return apiPatch(`/api/anomalies/${id}/dismiss`).then((updated) => {
      setAnomalies((prev) => prev.map((a) => (a.id === id ? updated : a)));
      return updated;
    });
  }, []);

  return { anomalies, loading, error, refetch, dismiss };
}
