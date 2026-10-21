import { useEffect, useState, useCallback } from 'react';
import { apiGet } from '../lib/api';

/** Fetches GET /api/analytics/cross-gym. Not WebSocket-driven -- no event
 * type covers cross-gym aggregate revenue, so this is a plain fetch. */
export default function useCrossGymRevenue() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(() => {
    setLoading(true);
    return apiGet('/api/analytics/cross-gym')
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}
