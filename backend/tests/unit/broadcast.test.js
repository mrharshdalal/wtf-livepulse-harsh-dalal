// Mocked BEFORE requiring broadcast.js, which imports { getClients } from
// this module at load time.
jest.mock('../../src/websocket/index', () => ({
  getClients: jest.fn(),
}));

const { getClients } = require('../../src/websocket/index');
const {
  broadcast,
  broadcastCheckin,
  broadcastCheckout,
  broadcastPayment,
  broadcastAnomalyDetected,
  broadcastAnomalyResolved,
} = require('../../src/websocket/broadcast');

function fakeClient() {
  return { readyState: 1, OPEN: 1, send: jest.fn() };
}

function lastSentPayload(client) {
  return JSON.parse(client.send.mock.calls[0][0]);
}

beforeEach(() => {
  getClients.mockReset();
});

describe('broadcast', () => {
  test('sends to every connected (OPEN) client and skips closed ones', () => {
    const open = fakeClient();
    const closed = { readyState: 3, OPEN: 1, send: jest.fn() };
    getClients.mockReturnValue([open, closed]);

    broadcast({ type: 'TEST' });

    expect(open.send).toHaveBeenCalledTimes(1);
    expect(closed.send).not.toHaveBeenCalled();
  });

  test('is a no-op with zero connected clients', () => {
    getClients.mockReturnValue([]);
    expect(() => broadcast({ type: 'TEST' })).not.toThrow();
  });
});

// Exact payload shapes per the assignment's WebSocket Event Protocol (6.2).
describe('event payload shapes', () => {
  let client;
  beforeEach(() => {
    client = fakeClient();
    getClients.mockReturnValue([client]);
  });

  test('CHECKIN_EVENT', () => {
    const ts = new Date('2026-10-22T08:00:00+05:30');
    broadcastCheckin({ gymId: 'g1', memberName: 'Rahul Sharma', timestamp: ts, currentOccupancy: 95, capacity: 100 });
    expect(lastSentPayload(client)).toEqual({
      type: 'CHECKIN_EVENT',
      gym_id: 'g1',
      member_name: 'Rahul Sharma',
      timestamp: ts.toISOString(),
      current_occupancy: 95,
      capacity_pct: 95,
    });
  });

  test('CHECKOUT_EVENT', () => {
    const ts = new Date('2026-10-22T09:00:00+05:30');
    broadcastCheckout({ gymId: 'g1', memberName: 'Priya Mehta', timestamp: ts, currentOccupancy: 50, capacity: 200 });
    expect(lastSentPayload(client)).toEqual({
      type: 'CHECKOUT_EVENT',
      gym_id: 'g1',
      member_name: 'Priya Mehta',
      timestamp: ts.toISOString(),
      current_occupancy: 50,
      capacity_pct: 25,
    });
  });

  test('PAYMENT_EVENT', () => {
    broadcastPayment({ gymId: 'g1', amount: 1499, planType: 'monthly', memberName: 'Ankit Verma', todayTotal: 23998 });
    expect(lastSentPayload(client)).toEqual({
      type: 'PAYMENT_EVENT',
      gym_id: 'g1',
      amount: 1499,
      plan_type: 'monthly',
      member_name: 'Ankit Verma',
      today_total: 23998,
    });
  });

  test('ANOMALY_DETECTED', () => {
    broadcastAnomalyDetected({
      anomalyId: 'a1', gymId: 'g1', gymName: 'WTF Gyms — Velachery',
      anomalyType: 'zero_checkins', severity: 'warning', message: 'No check-ins in 2 hours.',
    });
    expect(lastSentPayload(client)).toEqual({
      type: 'ANOMALY_DETECTED',
      anomaly_id: 'a1',
      gym_id: 'g1',
      gym_name: 'WTF Gyms — Velachery',
      anomaly_type: 'zero_checkins',
      severity: 'warning',
      message: 'No check-ins in 2 hours.',
    });
  });

  test('ANOMALY_RESOLVED', () => {
    const resolvedAt = new Date('2026-10-22T10:00:00+05:30');
    broadcastAnomalyResolved({ anomalyId: 'a1', gymId: 'g1', resolvedAt });
    expect(lastSentPayload(client)).toEqual({
      type: 'ANOMALY_RESOLVED',
      anomaly_id: 'a1',
      gym_id: 'g1',
      resolved_at: resolvedAt.toISOString(),
    });
  });
});
