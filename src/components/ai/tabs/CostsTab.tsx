/**
 * Costs Tab
 * 
 * Cost analytics with overview cards, interactive calculator, and charts.
 */

import { 
  DollarSign, TrendingUp, Cpu, Clock, Calculator, ChevronDown, ChevronUp,
  BarChart3
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useCostsTab } from './costs/useCostsTab';
import { StatCard } from './costs/StatCard';
import { CostCalculator } from './costs/CostCalculator';
import { ModelCostBar } from './costs/ModelCostBar';
import { TrendChart } from './costs/TrendChart';

interface CostsTabProps {
  isMobile: boolean;
  activeProviderId?: string | null;
}

export function CostsTab({ isMobile, activeProviderId }: CostsTabProps) {
  const {
    timeRange,
    setTimeRange,
    calculatorExpanded,
    setCalculatorExpanded,
    summary,
    summaryLoading,
    byModel,
    byModelLoading,
    trend,
    trendLoading,
  } = useCostsTab({ activeProviderId });

  return (
    <div className={cn('h-full overflow-auto', isMobile ? 'p-3' : 'p-4')}>
      <div className="space-y-4">
        {/* Time Range Selector */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-200">Cost Analytics</h3>
          <div className="flex gap-1">
            {(['today', 'week', 'month', 'all'] as const).map(r => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors capitalize',
                  timeRange === r
                    ? 'bg-violet-500/20 text-violet-300'
                    : 'text-zinc-500 hover:text-zinc-300'
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Overview Cards */}
        <div className={cn('grid gap-3', isMobile ? 'grid-cols-2' : 'grid-cols-4')}>
          <StatCard
            icon={<DollarSign className="h-4 w-4" />}
            label="Total Spend"
            value={summary ? `$${summary.totalCostUsd.toFixed(4)}` : '-'}
            loading={summaryLoading}
            accent="emerald"
          />
          <StatCard
            icon={<TrendingUp className="h-4 w-4" />}
            label="Avg per Request"
            value={summary ? `$${summary.avgCostPerRequest.toFixed(6)}` : '-'}
            loading={summaryLoading}
            accent="violet"
          />
          <StatCard
            icon={<Cpu className="h-4 w-4" />}
            label="Total Requests"
            value={summary ? summary.totalRequests.toLocaleString() : '-'}
            loading={summaryLoading}
            accent="blue"
          />
          <StatCard
            icon={<Clock className="h-4 w-4" />}
            label="Avg Latency"
            value={summary ? `${Math.round(summary.avgLatencyMs)}ms` : '-'}
            loading={summaryLoading}
            accent="amber"
          />
        </div>

        {/* Interactive Cost Calculator */}
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30">
          <button
            onClick={() => setCalculatorExpanded(!calculatorExpanded)}
            className="w-full flex items-center justify-between p-4 text-left"
          >
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-violet-400" />
              <span className="text-sm font-semibold text-zinc-200">Cost Calculator</span>
              <span className="text-xs text-zinc-500">Estimate costs for any model</span>
            </div>
            {calculatorExpanded ? (
              <ChevronUp className="h-4 w-4 text-zinc-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-zinc-500" />
            )}
          </button>

          {calculatorExpanded && (
            <div className="border-t border-zinc-800/50 p-4">
              <CostCalculator isMobile={isMobile} />
            </div>
          )}
        </div>

        {/* Cost by Model */}
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="h-4 w-4 text-violet-400" />
            <span className="text-sm font-semibold text-zinc-200">Cost by Model</span>
          </div>

          {byModelLoading ? (
            <div className="text-sm text-zinc-500 py-4 text-center">Loading...</div>
          ) : !byModel || byModel.length === 0 ? (
            <div className="text-sm text-zinc-500 py-4 text-center">
              No usage data yet. Start chatting to see your cost breakdown.
            </div>
          ) : (
            <div className="space-y-2">
              {byModel.map(m => (
                <ModelCostBar key={m.modelSlug} data={m} maxCost={byModel[0]?.totalCostUsd || 1} />
              ))}
            </div>
          )}
        </div>

        {/* Daily Trend */}
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-violet-400" />
            <span className="text-sm font-semibold text-zinc-200">Daily Trend</span>
          </div>

          {trendLoading ? (
            <div className="text-sm text-zinc-500 py-4 text-center">Loading...</div>
          ) : !trend || trend.length === 0 ? (
            <div className="text-sm text-zinc-500 py-4 text-center">
              No trend data yet.
            </div>
          ) : (
            <TrendChart data={trend} isMobile={isMobile} />
          )}
        </div>
      </div>
    </div>
  );
}
