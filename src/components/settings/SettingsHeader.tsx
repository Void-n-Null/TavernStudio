import { Rows3, LayoutGrid } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ExpandableSearch } from '../ui/expandable-search';

interface SettingsHeaderProps {
  compactMode: boolean;
  toggleCompactMode: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchExpanded: boolean;
  setSearchExpanded: (expanded: boolean) => void;
  isPending: boolean;
}

export function SettingsHeader({
  compactMode,
  toggleCompactMode,
  searchQuery,
  setSearchQuery,
  searchExpanded,
  setSearchExpanded,
  isPending,
}: SettingsHeaderProps) {
  return (
    <header className="shrink-0 px-5 py-4 border-b border-zinc-800/50 bg-zinc-950">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-base font-semibold text-zinc-100">Settings</h2>
            <p className="text-xs text-zinc-500">Configure application and interface</p>
          </div>
          
          <button
            onClick={toggleCompactMode}
            className={cn(
              "ml-2 p-1.5 rounded-lg transition-colors",
              compactMode 
                ? "bg-violet-500/20 text-violet-400" 
                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
            )}
            title={compactMode ? "Comfortable view" : "Compact view"}
          >
            {compactMode ? <Rows3 className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
          </button>
        </div>
        
        <div className="flex items-center gap-2 pr-12">
          <ExpandableSearch
            value={searchQuery}
            onChange={setSearchQuery}
            expanded={searchExpanded}
            onExpandedChange={setSearchExpanded}
            placeholder="Search settings..."
            shortcut="⌘K"
          />
          
          {isPending && (
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
              Saving
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

