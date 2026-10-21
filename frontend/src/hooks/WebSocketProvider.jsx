import { createContext, useContext } from 'react';
import useWebSocket from './useWebSocket';

const WebSocketContext = createContext(null);

export function WebSocketProvider({ children }) {
  const value = useWebSocket();
  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
}

export function useWebSocketContext() {
  const ctx = useContext(WebSocketContext);
  if (!ctx) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return ctx;
}
