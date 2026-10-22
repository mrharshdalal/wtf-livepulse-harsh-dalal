import { useEffect } from 'react';
import { useWebSocketContext } from './WebSocketProvider';
import useStore from '../store/useStore';
import { shortGymName } from '../lib/formatters';

const AUTO_DISMISS_MS = 6000;

/**
 * Mounted once in AppShell. Pushes a toast for every ANOMALY_DETECTED
 * push (assignment S6.2: "Show toast notification"), independent of
 * whichever page is currently active.
 */
export default function useAnomalyToasts() {
  const { subscribe } = useWebSocketContext();
  const pushToast = useStore((s) => s.pushToast);
  const dismissToast = useStore((s) => s.dismissToast);

  useEffect(() => {
    return subscribe('ANOMALY_DETECTED', (msg) => {
      const id = `${msg.anomaly_id}-${Date.now()}`;
      pushToast({
        id,
        severity: msg.severity,
        title: shortGymName(msg.gym_name) || msg.gym_name,
        message: msg.message,
      });
      setTimeout(() => dismissToast(id), AUTO_DISMISS_MS);
    });
  }, [subscribe, pushToast, dismissToast]);
}
