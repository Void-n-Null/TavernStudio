import { type DailyCostTrend } from '../../../../api/ai';
import { cn } from '../../../../lib/utils';

interface TrendChartProps {
  data: DailyCostTrend[];
  isMobile: boolean;
}

export function TrendChart({ data, isMobile }: TrendChartProps) {
  const maxCost = Math.max(...data.map(d => d.totalCostUsd), 0.0001);

  return (
    <div className="h-40 flex items-end gap-1.5 pt-8">
      {data.map((d, i) => {
        const height = maxCost > 0 ? (d.totalCostUsd / maxCost) * 100 : 0;
        const isToday = i === data.length - 1;
        
        return (
          <div
            key={d.date}
            className="flex-1 flex flex-col items-center gap-2 group relative h-full justify-end"
          >
            {/* Value Label on Hover or for Today if highlighting is desired */}
            <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-10 scale-95 group-hover:scale-100 origin-bottom">
              <div className="rounded-lg bg-zinc-800 border border-zinc-700 px-2.5 py-1.5 text-[10px] text-zinc-100 shadow-2xl whitespace-nowrap">
                <div className="font-bold text-violet-400">{d.date}</div>
                <div>${d.totalCostUsd.toFixed(4)}</div>
                <div className="text-zinc-500">{d.requestCount} requests</div>
              </div>
            </div>

            <div
              className={cn(
                "w-full rounded-t-sm transition-all duration-300 ease-out min-h-[4px]",
                isToday 
                  ? "bg-gradient-to-t from-violet-600 to-violet-400 shadow-[0_0_12px_rgba(139,92,246,0.2)]" 
                  : "bg-zinc-800 group-hover:bg-violet-500/50"
              )}
              style={{ height: `${Math.max(height, 4)}%` }}
            >
              {/* Subtle accent at the top of the bar */}
              <div className="h-0.5 w-full bg-white/20 rounded-full blur-[1px]" />
            </div>

            {!isMobile && (data.length <= 14 || i % 5 === 0) && (
              <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-tighter">
                {new Date(d.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

