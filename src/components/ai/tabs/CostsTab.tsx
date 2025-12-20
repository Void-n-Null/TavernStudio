/**
 * Costs Tab
 * 
 * Cost analytics with overview cards, interactive calculator, and charts.
 */

import { 
  DollarSign, TrendingUp, Cpu, Clock, 
  BarChart3
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useCostsTab } from './costs/useCostsTab';
import { ModelCostBar } from './costs/ModelCostBar';
import { TrendChart } from './costs/TrendChart';
import { useIsMobile } from '../../../hooks/useIsMobile';

interface CostsTabProps {
  activeProviderId?: string | null;
}

export function CostsTab({ activeProviderId }: CostsTabProps) {
  const isMobile = useIsMobile();
  const {
    timeRange,
    setTimeRange,
    summary,
    summaryLoading,
    byModel,
    byModelLoading,
    trend,
    trendLoading,
  } = useCostsTab({ activeProviderId });

  return (
    <div className={cn('h-full overflow-auto flex flex-col', isMobile ? 'p-3' : 'p-6')}>
      <div className="space-y-8 max-w-6xl mx-auto w-full">
        {/* Header Section */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800/60 pb-6">
          <div>
            <h3 className="text-xl font-bold text-zinc-100">Cost Analytics</h3>
            <p className="text-sm text-zinc-500 mt-1">Track your AI expenditure and model usage</p>
          </div>
          <div className="flex bg-zinc-900/50 p-1 rounded-xl border border-zinc-800/60 w-fit">
            {(['today', 'week', 'month', 'all'] as const).map(r => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={cn(
                  'rounded-lg px-4 py-1.5 text-xs font-semibold transition-all capitalize',
                  timeRange === r
                    ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/20'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-0 md:divide-x divide-zinc-800/60 bg-zinc-900/20 rounded-2xl border border-zinc-800/60 p-6">
          <StatItem
            icon={<DollarSign className="h-4 w-4" />}
            label="Total Spend"
            value={summary ? `$${summary.totalCostUsd.toFixed(4)}` : '-'}
            loading={summaryLoading}
            accent="emerald"
          />
          <StatItem
            icon={<TrendingUp className="h-4 w-4" />}
            label="Avg / Request"
            value={summary ? `$${summary.avgCostPerRequest.toFixed(6)}` : '-'}
            loading={summaryLoading}
            accent="violet"
            className="md:pl-8"
          />
          <StatItem
            icon={<Cpu className="h-4 w-4" />}
            label="Total Requests"
            value={summary ? summary.totalRequests.toLocaleString() : '-'}
            loading={summaryLoading}
            accent="blue"
            className="md:pl-8"
          />
          <StatItem
            icon={<Clock className="h-4 w-4" />}
            label="Avg Latency"
            value={summary ? `${Math.round(summary.avgLatencyMs)}ms` : '-'}
            loading={summaryLoading}
            accent="amber"
            className="md:pl-8"
          />
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Cost by Model */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20">
                <BarChart3 className="h-4 w-4 text-violet-400" />
              </div>
              <span className="font-bold text-zinc-100">Cost by Model</span>
            </div>

            <div className="bg-zinc-900/20 rounded-2xl border border-zinc-800/60 p-6 flex-1 min-h-[300px]">
              {byModelLoading ? (
                <div className="h-full flex items-center justify-center text-sm text-zinc-500">
                  <div className="animate-pulse">Loading usage data...</div>
                </div>
              ) : !byModel || byModel.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-sm text-zinc-500 gap-2">
                  <div className="p-3 rounded-full bg-zinc-800/50">
                    <BarChart3 className="h-6 w-6 text-zinc-600" />
                  </div>
                  <p>No usage data found for this period</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {byModel.map(m => (
                    <ModelCostBar key={m.modelSlug} data={m} maxCost={byModel[0]?.totalCostUsd || 1} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Daily Trend */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20">
                <TrendingUp className="h-4 w-4 text-violet-400" />
              </div>
              <span className="font-bold text-zinc-100">Daily Trend</span>
            </div>

            <div className="bg-zinc-900/20 rounded-2xl border border-zinc-800/60 p-6 flex-1 min-h-[300px] flex flex-col">
              {trendLoading ? (
                <div className="h-full flex items-center justify-center text-sm text-zinc-500">
                  <div className="animate-pulse">Loading trend data...</div>
                </div>
              ) : !trend || trend.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-sm text-zinc-500 gap-2">
                  <div className="p-3 rounded-full bg-zinc-800/50">
                    <TrendingUp className="h-6 w-6 text-zinc-600" />
                  </div>
                  <p>No trend data available</p>
                </div>
              ) : (
                <div className="mt-auto">
                  <TrendChart data={trend} isMobile={isMobile} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface StatItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  loading: boolean;
  accent: 'emerald' | 'violet' | 'blue' | 'amber';
  className?: string;
}

function StatItem({ icon, label, value, loading, accent, className }: StatItemProps) {
  const accentColors = {
    emerald: 'text-emerald-400',
    violet: 'text-violet-400',
    blue: 'text-blue-400',
    amber: 'text-amber-400',
  };

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-center gap-2">
        <span className={cn(accentColors[accent], "opacity-80")}>{icon}</span>
        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">{label}</span>
      </div>
      <div className={cn(
        "text-2xl font-black text-zinc-100 tracking-tight",
        loading && "animate-pulse"
      )}>
        {loading ? '...' : value}
      </div>
    </div>
  );
}
