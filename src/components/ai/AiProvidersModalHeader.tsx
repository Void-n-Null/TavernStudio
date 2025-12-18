import { RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import type { AiProviderStatus } from '../../api/client';

export function AiProvidersModalHeader({
  isMobile,
  providers,
  selectedProviderId,
  onSelectProvider,
  onRefresh,
  isRefreshing,
}: {
  isMobile: boolean;
  providers: AiProviderStatus[];
  selectedProviderId: string;
  onSelectProvider: (id: string) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}) {
  const headerRightPad = isMobile ? 'pr-12' : 'pr-14';

  return (
    <div className={cn('sticky top-0 z-10 border-b border-zinc-800/50 bg-zinc-950/90 backdrop-blur-md', headerRightPad)}>
      <div className="p-3 space-y-3">
        {/* Row 0: Title */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight text-zinc-100">AI Providers</h2>
        </div>

        {/* Row 1: Provider selector + refresh */}
        <div className="flex items-center gap-2">
          <Select value={selectedProviderId} onValueChange={onSelectProvider}>
            <SelectTrigger className="h-8 flex-1 bg-zinc-900/50 border-zinc-800/60 text-sm">
              <SelectValue placeholder="Select provider..." />
            </SelectTrigger>
            <SelectContent className="bg-zinc-950 border-zinc-800">
              {providers.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  <div className="flex items-center gap-2">
                    <ConnectionDot status={p.connection?.status} />
                    <span>{p.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Refresh"
          >
            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
          </Button>
        </div>
      </div>
    </div>
  );
}

function ConnectionDot({ status }: { status?: string }) {
  if (status === 'connected') {
    return <div className="h-2 w-2 rounded-full bg-emerald-500" />;
  }
  if (status === 'error') {
    return <div className="h-2 w-2 rounded-full bg-red-500" />;
  }
  return <div className="h-2 w-2 rounded-full bg-zinc-600" />;
}

