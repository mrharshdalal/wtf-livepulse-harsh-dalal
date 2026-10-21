import { useState } from 'react';
import useStore from '../store/useStore';
import useGymsList from '../hooks/useGymsList';
import useAnalytics from '../hooks/useAnalytics';
import useCrossGymRevenue from '../hooks/useCrossGymRevenue';
import Header from '../components/layout/Header';
import Pill from '../components/ui/Pill';
import Heatmap from '../components/analytics/Heatmap';
import RevenueByPlanChart from '../components/analytics/RevenueByPlanChart';
import NewRenewalDonut from '../components/analytics/NewRenewalDonut';
import CrossGymBarChart from '../components/analytics/CrossGymBarChart';
import ChurnRiskTable from '../components/analytics/ChurnRiskTable';
import { shortGymName } from '../lib/formatters';

const RANGES = ['7d', '30d', '90d'];

export default function Analytics() {
  const selectedGymId = useStore((s) => s.selectedGymId);
  const { gyms } = useGymsList();
  const [dateRange, setDateRange] = useState('30d');
  const { data, loading, error } = useAnalytics(selectedGymId, dateRange);
  const { data: crossGym, loading: crossGymLoading, error: crossGymError } = useCrossGymRevenue();

  const gym = gyms.find((g) => g.id === selectedGymId);

  return (
    <div>
      <Header
        breadcrumb="Analytics"
        title={gym ? `Analytics — ${shortGymName(gym.name)}` : 'Analytics'}
        subtitle="Peak hours, revenue mix, churn risk, and cross-gym comparison."
      >
        <div className="pill-row">
          {RANGES.map((r) => (
            <Pill key={r} active={dateRange === r} onClick={() => setDateRange(r)}>
              {r}
            </Pill>
          ))}
        </div>
      </Header>

      <div className="col">
        <Heatmap data={data?.heatmap || []} loading={loading} error={error} />

        <div className="row-two">
          <RevenueByPlanChart data={data?.revenue_by_plan || []} loading={loading} error={error} />
          <NewRenewalDonut data={data?.new_vs_renewal || []} loading={loading} error={error} />
        </div>

        <div className="row-two">
          <CrossGymBarChart data={crossGym} loading={crossGymLoading} error={crossGymError} />
          <ChurnRiskTable
            data={data?.churn_risk || []}
            loading={loading}
            error={error}
            gymName={gym ? shortGymName(gym.name) : ''}
          />
        </div>
      </div>
    </div>
  );
}
