// TODO: fetch live gym data from /api/gyms/:id/live and keep it updated via
// WebSocket CHECKIN_EVENT/CHECKOUT_EVENT/PAYMENT_EVENT messages.
export default function useGymData(gymId) {
  return { data: null, loading: true, error: null };
}
