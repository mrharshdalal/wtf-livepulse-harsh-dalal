// TODO: fetch anomalies from /api/anomalies and keep them updated via
// WebSocket ANOMALY_DETECTED/ANOMALY_RESOLVED messages.
export default function useAnomalies(gymId) {
  return { data: null, loading: true, error: null };
}
