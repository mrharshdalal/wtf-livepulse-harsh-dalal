import { useEffect, useState, useCallback } from 'react';
import { apiGet } from '../lib/api';
import { useWebSocketContext } from './WebSocketProvider';

const MAX_FEED_ITEMS = 20;

/**
 * Cross-gym activity feed (assignment M-05: "last 20 events across all
 * gyms"). Fetches GET /api/events/recent once, then prepends live
 * WebSocket events as they arrive. Live-pushed events only carry gym_id
 * (not gym_name, per the assignment's own payload shapes), so callers
 * resolve the display name via a gym_id -> name lookup (e.g. from
 * useGymsList) rather than relying on this hook to know gym names.
 */
export default function useActivityFeed() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { subscribe } = useWebSocketContext();

  const refetch = useCallback(() => {
    setLoading(true);
    return apiGet(`/api/events/recent?limit=${MAX_FEED_ITEMS}`)
      .then((data) => {
        setEvents(data);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    const prepend = (entry) => setEvents((prev) => [entry, ...prev].slice(0, MAX_FEED_ITEMS));

    const onCheckin = (msg) =>
      prepend({
        event_type: 'checkin',
        event_time: msg.timestamp,
        member_name: msg.member_name,
        gym_id: msg.gym_id,
        amount: null,
        plan_type: null,
      });
    const onCheckout = (msg) =>
      prepend({
        event_type: 'checkout',
        event_time: msg.timestamp,
        member_name: msg.member_name,
        gym_id: msg.gym_id,
        amount: null,
        plan_type: null,
      });
    const onPayment = (msg) =>
      prepend({
        event_type: 'payment',
        event_time: new Date().toISOString(),
        member_name: msg.member_name,
        gym_id: msg.gym_id,
        amount: msg.amount,
        plan_type: msg.plan_type,
      });

    const unsubs = [
      subscribe('CHECKIN_EVENT', onCheckin),
      subscribe('CHECKOUT_EVENT', onCheckout),
      subscribe('PAYMENT_EVENT', onPayment),
    ];
    return () => unsubs.forEach((u) => u());
  }, [subscribe]);

  return { events, loading, error, refetch };
}
