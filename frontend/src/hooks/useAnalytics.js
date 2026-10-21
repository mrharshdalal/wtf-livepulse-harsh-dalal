import { useEffect, useState, useCallback } from 'react';
import { apiGet } from '../lib/api';

/** Fetches GET /api/gyms/:id/analytics?dateRange=, refetching on change. */
export default function useAnalytics(gymId, dateRange = '30d') {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(() => {
    if (!gymId) return undefined;
    setLoading(true);
    return apiGet(`/api/gyms/${gymId}/analytics?dateRange=${dateRange}`)
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [gymId, dateRange]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}
