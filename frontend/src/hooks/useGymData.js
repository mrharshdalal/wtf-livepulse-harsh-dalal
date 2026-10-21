import { useEffect, useState, useCallback } from 'react';
import { apiGet } from '../lib/api';
import { useWebSocketContext } from './WebSocketProvider';

const MAX_FEED_ITEMS = 20;

/**
 * Fetches a single gym's live snapshot (GET /api/gyms/:id/live) and keeps
 * it updated in place via WebSocket events, without refetching.
 */
export default function useGymData(gymId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { subscribe } = useWebSocketContext();

  const refetch = useCallback(() => {
    if (!gymId) return undefined;
    setLoading(true);
    return apiGet(`/api/gyms/${gymId}/live`)
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [gymId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    if (!gymId) return undefined;

    const onCheckin = (msg) => {
      if (msg.gym_id !== gymId) return;
      setData((prev) =>
        prev && {
          ...prev,
          current_occupancy: msg.current_occupancy,
          capacity_pct: msg.capacity_pct,
          recent_events: [
            { event_type: 'checkin', event_time: msg.timestamp, member_name: msg.member_name, amount: null, plan_type: null },
            ...prev.recent_events,
          ].slice(0, MAX_FEED_ITEMS),
        }
      );
    };

    const onCheckout = (msg) => {
      if (msg.gym_id !== gymId) return;
      setData((prev) =>
        prev && {
          ...prev,
          current_occupancy: msg.current_occupancy,
          capacity_pct: msg.capacity_pct,
          recent_events: [
            { event_type: 'checkout', event_time: msg.timestamp, member_name: msg.member_name, amount: null, plan_type: null },
            ...prev.recent_events,
          ].slice(0, MAX_FEED_ITEMS),
        }
      );
    };

    const onPayment = (msg) => {
      if (msg.gym_id !== gymId) return;
      setData((prev) =>
        prev && {
          ...prev,
          today_revenue: msg.today_total,
          recent_events: [
            {
              event_type: 'payment',
              event_time: new Date().toISOString(),
              member_name: msg.member_name,
              amount: msg.amount,
              plan_type: msg.plan_type,
            },
            ...prev.recent_events,
          ].slice(0, MAX_FEED_ITEMS),
        }
      );
    };

    const onAnomalyDetected = (msg) => {
      if (msg.gym_id !== gymId) return;
      setData((prev) =>
        prev && {
          ...prev,
          active_anomalies: [
            { id: msg.anomaly_id, type: msg.anomaly_type, severity: msg.severity, message: msg.message, detected_at: new Date().toISOString() },
            ...prev.active_anomalies,
          ],
        }
      );
    };

    const onAnomalyResolved = (msg) => {
      if (msg.gym_id !== gymId) return;
      setData((prev) => prev && { ...prev, active_anomalies: prev.active_anomalies.filter((a) => a.id !== msg.anomaly_id) });
    };

    const unsubs = [
      subscribe('CHECKIN_EVENT', onCheckin),
      subscribe('CHECKOUT_EVENT', onCheckout),
      subscribe('PAYMENT_EVENT', onPayment),
      subscribe('ANOMALY_DETECTED', onAnomalyDetected),
      subscribe('ANOMALY_RESOLVED', onAnomalyResolved),
    ];
    return () => unsubs.forEach((u) => u());
  }, [gymId, subscribe]);

  return { data, loading, error, refetch };
}
