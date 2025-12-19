import { Zap, Check, Settings2, AlertCircle, RefreshCw } from 'lucide-react';
import { type AiProviderStatus } from '../../../api/client';
import { cn } from '../../../lib/utils';
import { Button } from '../../ui/button';

interface ProviderTileProps {
  provider: AiProviderStatus;
  isActive: boolean;
  onActivate: () => void;
  onConfigure: () => void;
  isMobile: boolean;
}

export function ProviderTile({
  provider,
  isActive,
  onActivate,
  onConfigure,
  isMobile,
}: ProviderTileProps) {
  const isConnected = provider.connection?.status === 'connected';
  const hasError = provider.connection?.last_error;
  const configuredStrategies = provider.authStrategies.filter(s => s.configured).length;

  return (
    <div
      className={cn(
        'group relative flex flex-col rounded-2xl border transition-all duration-200 overflow-hidden',
        isActive
          ? 'border-violet-500/50 bg-violet-500/[0.03] ring-1 ring-violet-500/20'
          : 'border-zinc-800/60 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-900/50'
      )}
    >
      {/* Top Bar: Icon and Badges */}
      <div className="flex items-start justify-between p-4 pb-0">
        <div className={cn(
          'flex h-12 w-12 items-center justify-center rounded-xl transition-colors',
          isConnected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-500',
          isActive && 'bg-violet-500/20 text-violet-400'
        )}>
          <Zap className={cn('h-6 w-6', isConnected && !isActive && 'animate-pulse')} />
        </div>

        <div className="flex flex-col items-end gap-1.5">
          {isActive ? (
            <span className="flex items-center gap-1 rounded-full bg-violet-500/20 px-2.5 py-1 text-[10px] font-bold text-violet-400 border border-violet-500/30 uppercase tracking-tight">
              <Check className="h-3 w-3" />
              Active
            </span>
          ) : isConnected ? (
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-400 border border-emerald-500/20 uppercase tracking-tight">
              Connected
            </span>
          ) : (
            <span className="rounded-full bg-zinc-800/80 px-2.5 py-1 text-[10px] font-bold text-zinc-500 border border-zinc-700/50 uppercase tracking-tight">
              Offline
            </span>
          )}
          
          {hasError && (
            <div className="flex items-center gap-1 text-[10px] font-bold text-red-400 uppercase">
              <AlertCircle className="h-3 w-3" />
              Error
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4">
        <h3 className="font-bold text-zinc-100 text-lg leading-tight mb-1">
          {provider.label}
        </h3>
        <p className="text-xs text-zinc-500 font-medium">
          {configuredStrategies} of {provider.authStrategies.length} auth methods configured
        </p>
        
        {hasError && (
          <p className="mt-2 text-xs text-red-400/90 line-clamp-1 italic">
            "{provider.connection?.last_error}"
          </p>
        )}
      </div>

      {/* Action Footer */}
      <div className="mt-auto border-t border-zinc-800/40 bg-zinc-950/20 p-3 flex gap-2">
        {isConnected && !isActive && (
          <Button
            size="sm"
            onClick={(e) => { e.stopPropagation(); onActivate(); }}
            className="flex-1 h-9 font-bold text-xs bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/20"
          >
            Use This Provider
          </Button>
        )}
        
        {!isConnected && (
          <Button
            size="sm"
            variant="outline"
            onClick={onConfigure}
            className="flex-1 h-9 font-bold text-xs border-zinc-800 hover:bg-zinc-800 text-zinc-300"
          >
            Connect Now
          </Button>
        )}

        {(isConnected || isActive) && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onConfigure}
            className={cn(
              "h-9 px-3 border border-transparent hover:border-zinc-800 hover:bg-zinc-800/50 text-zinc-400 hover:text-zinc-200",
              !isConnected && "hidden"
            )}
          >
            <Settings2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

