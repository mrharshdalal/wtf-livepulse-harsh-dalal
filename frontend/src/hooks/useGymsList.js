import { useEffect, useState, useCallback } from 'react';
import { apiGet } from '../lib/api';
import { useWebSocketContext } from './WebSocketProvider';

/**
 * Backs the sidebar gym list and the Dashboard's "All Gyms" card.
 * Fetches GET /api/gyms once, then patches individual gyms in place as
 * CHECKIN_EVENT/CHECKOUT_EVENT/PAYMENT_EVENT arrive -- avoids refetching
 * all 10 gyms on every live event.
 */
export default function useGymsList() {
  const [gyms, setGyms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { subscribe } = useWebSocketContext();

  const refetch = useCallback(() => {
    setLoading(true);
    return apiGet('/api/gyms')
      .then((data) => {
        setGyms(data);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    const patchOccupancy = (msg) => {
      setGyms((prev) =>
        prev.map((g) => (g.id === msg.gym_id ? { ...g, current_occupancy: msg.current_occupancy } : g))
      );
    };
    const patchRevenue = (msg) => {
      setGyms((prev) => (prev.map((g) => (g.id === msg.gym_id ? { ...g, today_revenue: msg.today_total } : g))));
    };

    const unsubCheckin = subscribe('CHECKIN_EVENT', patchOccupancy);
    const unsubCheckout = subscribe('CHECKOUT_EVENT', patchOccupancy);
    const unsubPayment = subscribe('PAYMENT_EVENT', patchRevenue);

    return () => {
      unsubCheckin();
      unsubCheckout();
      unsubPayment();
    };
  }, [subscribe]);

  return { gyms, loading, error, refetch };
}
