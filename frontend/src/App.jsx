import { Routes, Route } from 'react-router-dom';
import { WebSocketProvider } from './hooks/WebSocketProvider';
import AppShell from './components/layout/AppShell';
import Dashboard from './pages/Dashboard.jsx';
import Analytics from './pages/Analytics.jsx';
import Anomalies from './pages/Anomalies.jsx';

export default function App() {
  return (
    <WebSocketProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/anomalies" element={<Anomalies />} />
        </Route>
      </Routes>
    </WebSocketProvider>
  );
}
