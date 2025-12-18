import { Rows3, LayoutGrid } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SettingsMobileHeaderProps {
  compactMode: boolean;
  toggleCompactMode: () => void;
  isPending: boolean;
}

export function SettingsMobileHeader({
  compactMode,
  toggleCompactMode,
  isPending,
}: SettingsMobileHeaderProps) {
  return (
    <header className="shrink-0 px-4 py-3 border-b border-zinc-800/50 bg-zinc-950 flex items-center justify-between">
      <h2 className="text-sm font-semibold text-zinc-100">Settings</h2>
      <div className="flex items-center gap-2 pr-8">
        {isPending && (
          <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
        )}
        <button
          onClick={toggleCompactMode}
          className={cn(
            "p-1.5 rounded-lg transition-colors",
            compactMode 
              ? "bg-violet-500/20 text-violet-400" 
              : "text-zinc-500 active:bg-zinc-800/50"
          )}
        >
          {compactMode ? <Rows3 className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
        </button>
      </div>
    </header>
  );
}

