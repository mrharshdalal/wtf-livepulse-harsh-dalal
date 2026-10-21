import useStore from '../store/useStore';
import useGymData from '../hooks/useGymData';
import useGymsList from '../hooks/useGymsList';
import useActivityFeed from '../hooks/useActivityFeed';
import useCountUp from '../hooks/useCountUp';
import Header from '../components/layout/Header';
import ActivityFeed from '../components/dashboard/ActivityFeed';
import OccupancyCard from '../components/dashboard/OccupancyCard';
import AllGymsMini from '../components/dashboard/AllGymsMini';
import SimulatorControl from '../components/dashboard/SimulatorControl';
import SkeletonCard from '../components/ui/SkeletonCard';
import ErrorState from '../components/ui/ErrorState';
import { formatINR } from '../lib/formatters';

export default function Dashboard() {
  const selectedGymId = useStore((s) => s.selectedGymId);
  const { gyms } = useGymsList();
  const { data: gymData, loading, error } = useGymData(selectedGymId);
  const { events, loading: feedLoading, error: feedError } = useActivityFeed();

  const gymNameById = Object.fromEntries(gyms.map((g) => [g.id, g.name]));
  const animatedRevenue = useCountUp(gymData?.today_revenue || 0);

  const occupancyPct = gymData && gymData.capacity ? (gymData.current_occupancy / gymData.capacity) * 100 : 0;
  const occBand = occupancyPct > 85 ? 'crit' : occupancyPct >= 60 ? 'warn' : 'ok';

  const totalCheckedIn = gyms.reduce((sum, g) => sum + (g.current_occupancy || 0), 0);

  return (
    <div>
      <Header
        breadcrumb="Dashboard"
        title={gymData ? gymData.gym_name : 'Dashboard'}
        subtitle={
          gymData
            ? `${totalCheckedIn} members checked in right now, across ${gyms.length} locations.`
            : error
              ? 'Unable to load gym data.'
              : 'Loading gym data…'
        }
      >
        {gymData && (
          <>
            <div className={`kpi-callout ${occBand}`}>
              <div className="n">{occupancyPct.toFixed(1)}%</div>
              <div className="l">occupancy</div>
            </div>
            <div className="kpi-callout">
              <div className="n">{formatINR(animatedRevenue)}</div>
              <div className="l">today's revenue</div>
            </div>
          </>
        )}
      </Header>

      {error && <ErrorState message={error} />}

      <div className="grid-dashboard">
        <ActivityFeed events={events} gymNameById={gymNameById} loading={feedLoading} error={feedError} />

        <div className="col">
          {loading || !gymData ? (
            <SkeletonCard height={220} />
          ) : (
            <OccupancyCard gymName={gymData.gym_name} capacity={gymData.capacity} occupancy={gymData.current_occupancy} />
          )}
          <AllGymsMini gyms={gyms} />
          <SimulatorControl />
        </div>
      </div>
    </div>
  );
}
