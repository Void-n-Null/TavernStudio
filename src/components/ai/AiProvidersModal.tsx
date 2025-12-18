import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent } from '../ui/dialog';
import { useIsMobile } from '../../hooks/useIsMobile';
import { cn } from '../../lib/utils';
import { queryKeys } from '../../lib/queryClient';
import { AiProvidersModalHeader } from './AiProvidersModalHeader';
import { AiProvidersModalContent } from './AiProvidersModalContent';
import { useAiProvidersModalController } from './useAiProvidersModalController';

interface AiProvidersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AiProvidersModal({ open, onOpenChange }: AiProvidersModalProps) {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const c = useAiProvidersModalController(open);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.aiProviders.all });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        fullscreen={isMobile}
        className={cn('p-0 overflow-hidden', !isMobile && 'h-[85vh] max-w-2xl')}
      >
        <div className="flex h-full flex-col">
          <AiProvidersModalHeader
            isMobile={isMobile}
            providers={c.providers}
            selectedProviderId={c.selectedProviderId}
            onSelectProvider={c.selectProvider}
            onRefresh={handleRefresh}
            isRefreshing={c.isLoading}
          />

          <div className={cn('flex-1 overflow-auto', isMobile ? 'p-3' : 'p-4')}>
            {c.isLoading ? (
              <div className="text-sm text-zinc-500">Loading providers…</div>
            ) : c.selectedProvider ? (
              <AiProvidersModalContent
                provider={c.selectedProvider}
                isMobile={isMobile}
                selectedStrategyId={c.selectedStrategyId}
                onSelectStrategy={c.setSelectedStrategyId}
                secretDrafts={c.secretDrafts}
                onSetSecretDraft={c.setSecretDraft}
                onSaveSecrets={c.saveSecrets}
                onConnect={c.connect}
                onDisconnect={c.disconnect}
                onStartPkce={c.startPkce}
                isSaving={c.isSaving}
                isConnecting={c.isConnecting}
                isDisconnecting={c.isDisconnecting}
                selectedModelId={c.selectedModelId}
                onSelectModel={c.selectModel}
              />
            ) : (
              <div className="text-sm text-zinc-500 p-4">
                No providers available.
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
