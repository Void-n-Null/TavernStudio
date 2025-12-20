import { type ModelCostBreakdown } from '../../../../api/ai';

interface ModelCostBarProps {
  data: ModelCostBreakdown;
  maxCost: number;
}

export function ModelCostBar({ data, maxCost }: ModelCostBarProps) {
  const percentage = maxCost > 0 ? (data.totalCostUsd / maxCost) * 100 : 0;
  const displayName = data.modelSlug.split('/').pop() || data.modelSlug;

  return (
    <div className="group space-y-2">
      <div className="flex items-center justify-between text-xs">
        <div className="flex flex-col">
          <span className="text-zinc-100 font-semibold group-hover:text-violet-400 transition-colors">
            {displayName}
          </span>
          <span className="text-zinc-500 text-[10px]">{data.modelSlug}</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-zinc-100 font-mono font-bold">${data.totalCostUsd.toFixed(4)}</span>
          <span className="text-zinc-500 text-[10px]">{data.requestCount.toLocaleString()} requests</span>
        </div>
      </div>
      <div className="h-1.5 w-full bg-zinc-800/50 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-violet-600 via-violet-500 to-fuchsia-500 rounded-full transition-all duration-500 ease-out shadow-[0_0_8px_rgba(139,92,246,0.3)]"
          style={{ width: `${Math.max(percentage, 1)}%` }}
        />
      </div>
    </div>
  );
}

