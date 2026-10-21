import { Outlet } from 'react-router-dom';
import IconRail from './IconRail';
import SidePanel from './SidePanel';
import useAnomalies from '../../hooks/useAnomalies';

export default function AppShell() {
  // Mounted unconditionally (not just on the Anomalies page) purely for
  // its side effect of keeping useStore.anomalyCount in sync globally --
  // the rail badge and the Dashboard's "All Gyms" summary both need it
  // regardless of which page is currently active. The Anomalies page
  // itself mounts a second, separately-filtered useAnomalies() call for
  // its detailed list; the tiny duplicate fetch is a non-issue at this
  // data volume.
  useAnomalies({ updatesGlobalCount: true });

  return (
    <div className="app-shell">
      <IconRail />
      <SidePanel />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
