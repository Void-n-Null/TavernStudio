/**
 * Providers Tab
 * 
 * Shows provider tiles with connection status and configuration panels.
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Check, Link2, Link2Off, Eye, EyeOff, ExternalLink, 
  Zap, ChevronRight, AlertCircle, RefreshCw 
} from 'lucide-react';
import { aiProviders, type AiProviderStatus } from '../../../api/client';
import { queryKeys } from '../../../lib/queryClient';
import { cn } from '../../../lib/utils';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { showToast } from '../../ui/toast';

interface ProvidersTabProps {
  isMobile: boolean;
}

type SecretDraftKey = `${string}:${string}:${string}`;

export function ProvidersTab({ isMobile }: ProvidersTabProps) {
  const queryClient = useQueryClient();
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [secretDrafts, setSecretDrafts] = useState<Record<SecretDraftKey, string>>({});

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: queryKeys.aiProviders.list(),
    queryFn: () => aiProviders.list().then(r => r.providers),
  });

  const providers = data ?? [];
  const selectedProvider = providers.find(p => p.id === selectedProviderId);

  // Mutations
  const setSecretsMutation = useMutation({
    mutationFn: async (args: { providerId: string; authStrategyId: string; secrets: Record<string, string> }) => {
      return await aiProviders.setSecrets(args.providerId, args.authStrategyId, args.secrets);
    },
    onSuccess: async () => {
      showToast({ message: 'Credentials saved', type: 'success' });
      await queryClient.invalidateQueries({ queryKey: queryKeys.aiProviders.all });
    },
    onError: (e) => showToast({ message: e instanceof Error ? e.message : String(e), type: 'error' }),
  });

  const connectMutation = useMutation({
    mutationFn: async (args: { providerId: string; authStrategyId: string }) => {
      return await aiProviders.connect(args.providerId, args.authStrategyId);
    },
    onSuccess: async () => {
      showToast({ message: 'Connected successfully', type: 'success' });
      await queryClient.invalidateQueries({ queryKey: queryKeys.aiProviders.all });
    },
    onError: (e) => showToast({ message: e instanceof Error ? e.message : String(e), type: 'error' }),
  });

  const disconnectMutation = useMutation({
    mutationFn: async (args: { providerId: string }) => {
      return await aiProviders.disconnect(args.providerId);
    },
    onSuccess: async () => {
      showToast({ message: 'Disconnected', type: 'info' });
      await queryClient.invalidateQueries({ queryKey: queryKeys.aiProviders.all });
    },
    onError: (e) => showToast({ message: e instanceof Error ? e.message : String(e), type: 'error' }),
  });

  const handleSaveAndConnect = useCallback(async (providerId: string, strategyId: string, requiredKeys: string[]) => {
    const secrets: Record<string, string> = {};
    for (const k of requiredKeys) {
      const dk: SecretDraftKey = `${providerId}:${strategyId}:${k}`;
      const v = (secretDrafts[dk] ?? '').trim();
      if (v) secrets[k] = v;
    }

    if (Object.keys(secrets).length > 0) {
      await setSecretsMutation.mutateAsync({ providerId, authStrategyId: strategyId, secrets });
    }

    // Connect after save
    setTimeout(() => {
      connectMutation.mutate({ providerId, authStrategyId: strategyId });
    }, 100);
  }, [secretDrafts, setSecretsMutation, connectMutation]);

  return (
    <div className={cn('h-full overflow-auto', isMobile ? 'p-3' : 'p-4')}>
      {/* Header with refresh */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-zinc-200">Connected Providers</h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Configure your AI provider connections
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="h-8 px-2"
        >
          <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
        </Button>
      </div>

      {isLoading ? (
        <div className="text-sm text-zinc-500 py-8 text-center">Loading providers...</div>
      ) : (
        <div className="space-y-3">
          {/* Provider Tiles Grid */}
          <div className={cn(
            'grid gap-3',
            isMobile ? 'grid-cols-1' : 'grid-cols-2'
          )}>
            {providers.map(provider => (
              <ProviderTile
                key={provider.id}
                provider={provider}
                selected={selectedProviderId === provider.id}
                onClick={() => setSelectedProviderId(
                  selectedProviderId === provider.id ? null : provider.id
                )}
              />
            ))}
          </div>

          {/* Connection Panel (expanded when tile selected) */}
          {selectedProvider && (
            <ConnectionPanel
              provider={selectedProvider}
              isMobile={isMobile}
              secretDrafts={secretDrafts}
              setSecretDrafts={setSecretDrafts}
              onSaveAndConnect={handleSaveAndConnect}
              onDisconnect={(providerId) => disconnectMutation.mutate({ providerId })}
              isSaving={setSecretsMutation.isPending}
              isConnecting={connectMutation.isPending}
              isDisconnecting={disconnectMutation.isPending}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ============ Provider Tile ============

function ProviderTile({
  provider,
  selected,
  onClick,
}: {
  provider: AiProviderStatus;
  selected: boolean;
  onClick: () => void;
}) {
  const isConnected = provider.connection?.status === 'connected';
  const hasError = provider.connection?.last_error;
  const configuredStrategies = provider.authStrategies.filter(s => s.configured).length;

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative w-full rounded-xl border p-4 text-left transition-all',
        selected
          ? 'border-violet-500/50 bg-violet-500/5 ring-1 ring-violet-500/20'
          : 'border-zinc-800/60 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-900/50'
      )}
    >
      {/* Status indicator */}
      <div className="absolute top-3 right-3">
        {hasError ? (
          <div className="h-3 w-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
        ) : isConnected ? (
          <div className="h-3 w-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
        ) : (
          <div className="h-3 w-3 rounded-full bg-zinc-600" />
        )}
      </div>

      {/* Provider info */}
      <div className="flex items-start gap-3">
        <div className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
          isConnected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-400'
        )}>
          {provider.id === 'openrouter' ? (
            <Zap className="h-5 w-5" />
          ) : (
            <Zap className="h-5 w-5" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-100">{provider.label}</span>
            {isConnected && (
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                Connected
              </span>
            )}
          </div>

          <div className="mt-1 text-xs text-zinc-500">
            {configuredStrategies}/{provider.authStrategies.length} auth methods configured
          </div>

          {hasError && (
            <div className="mt-1.5 flex items-center gap-1 text-xs text-red-400">
              <AlertCircle className="h-3 w-3" />
              {provider.connection?.last_error}
            </div>
          )}

          {isConnected && provider.connection?.auth_strategy_id && (
            <div className="mt-1.5 text-xs text-zinc-500">
              via {provider.connection.auth_strategy_id}
            </div>
          )}
        </div>

        <ChevronRight className={cn(
          'h-5 w-5 text-zinc-600 transition-transform shrink-0',
          selected && 'rotate-90'
        )} />
      </div>
    </button>
  );
}

// ============ Connection Panel ============

function ConnectionPanel({
  provider,
  isMobile,
  secretDrafts,
  setSecretDrafts,
  onSaveAndConnect,
  onDisconnect,
  isSaving,
  isConnecting,
  isDisconnecting,
}: {
  provider: AiProviderStatus;
  isMobile: boolean;
  secretDrafts: Record<SecretDraftKey, string>;
  setSecretDrafts: React.Dispatch<React.SetStateAction<Record<SecretDraftKey, string>>>;
  onSaveAndConnect: (providerId: string, strategyId: string, requiredKeys: string[]) => void;
  onDisconnect: (providerId: string) => void;
  isSaving: boolean;
  isConnecting: boolean;
  isDisconnecting: boolean;
}) {
  const isConnected = provider.connection?.status === 'connected';
  const [selectedStrategyId, setSelectedStrategyId] = useState(
    provider.connection?.auth_strategy_id || provider.authStrategies[0]?.id || ''
  );

  const selectedStrategy = provider.authStrategies.find(s => s.id === selectedStrategyId);

  return (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/20 p-4 space-y-4">
      {/* Connection Status */}
      {isConnected && (
        <div className="flex items-center justify-between rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2">
          <div className="flex items-center gap-2 text-sm text-emerald-400">
            <Link2 className="h-4 w-4" />
            Connected via {provider.connection?.auth_strategy_id}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDisconnect(provider.id)}
            disabled={isDisconnecting}
            className="h-7 text-xs text-zinc-400 hover:text-red-400"
          >
            <Link2Off className="h-3.5 w-3.5 mr-1" />
            Disconnect
          </Button>
        </div>
      )}

      {/* Auth Strategy Selection */}
      {provider.authStrategies.length > 1 && (
        <div>
          <Label className="text-xs text-zinc-400 mb-2 block">Authentication Method</Label>
          <div className={cn('flex gap-2', isMobile && 'flex-col')}>
            {provider.authStrategies.map(s => (
              <button
                key={s.id}
                onClick={() => setSelectedStrategyId(s.id)}
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all',
                  selectedStrategyId === s.id
                    ? 'border-violet-500/50 bg-violet-500/10 text-zinc-100'
                    : 'border-zinc-800 text-zinc-400 hover:border-zinc-700'
                )}
              >
                {s.type === 'pkce' ? <ExternalLink className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
                <span className="font-medium">{s.label}</span>
                {s.configured && <Check className="h-4 w-4 text-emerald-500" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Strategy-specific form */}
      {selectedStrategy && (
        <AuthStrategyForm
          providerId={provider.id}
          strategy={selectedStrategy}
          secretDrafts={secretDrafts}
          setSecretDrafts={setSecretDrafts}
          onSaveAndConnect={(strategyId, requiredKeys) => onSaveAndConnect(provider.id, strategyId, requiredKeys)}
          isSaving={isSaving}
          isConnecting={isConnecting}
          isConnected={isConnected && provider.connection?.auth_strategy_id === selectedStrategy.id}
          isMobile={isMobile}
        />
      )}
    </div>
  );
}

// ============ Auth Strategy Form ============

function AuthStrategyForm({
  providerId,
  strategy,
  secretDrafts,
  setSecretDrafts,
  onSaveAndConnect,
  isSaving,
  isConnecting,
  isConnected,
  isMobile,
}: {
  providerId: string;
  strategy: {
    id: string;
    label: string;
    type: string;
    configured: boolean;
    requiredKeys: string[];
    presentKeys: string[];
  };
  secretDrafts: Record<SecretDraftKey, string>;
  setSecretDrafts: React.Dispatch<React.SetStateAction<Record<SecretDraftKey, string>>>;
  onSaveAndConnect: (strategyId: string, requiredKeys: string[]) => void;
  isSaving: boolean;
  isConnecting: boolean;
  isConnected: boolean;
  isMobile: boolean;
}) {
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  // PKCE OAuth
  if (strategy.type === 'pkce') {
    return (
      <div className="space-y-3">
        <div className="rounded-lg bg-zinc-800/50 p-3">
          <h4 className="text-sm font-medium text-zinc-200 mb-1">OAuth Authentication</h4>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Link your OpenRouter account securely. Your API key will be automatically generated and stored.
            This method is recommended as it handles key rotation automatically.
          </p>
        </div>

        <div className={cn('flex gap-2', isMobile && 'flex-col')}>
          <Button
            onClick={async () => {
              try {
                const returnUrl = window.location.origin;
                const { authUrl } = await aiProviders.startOpenRouterPkce(returnUrl);
                window.location.href = authUrl;
              } catch (e) {
                showToast({ message: e instanceof Error ? e.message : String(e), type: 'error' });
              }
            }}
            className="gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Connect with OpenRouter
          </Button>
        </div>

        {strategy.configured && (
          <p className="flex items-center gap-1.5 text-xs text-emerald-400">
            <Check className="h-3.5 w-3.5" />
            OAuth token is stored and ready
          </p>
        )}
      </div>
    );
  }

  // API Key
  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-zinc-800/50 p-3">
        <h4 className="text-sm font-medium text-zinc-200 mb-1">API Key Authentication</h4>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Enter your API key directly. Your key is encrypted and stored locally—it never leaves your machine.
        </p>
      </div>

      {strategy.requiredKeys.map(key => {
        const draftKey: SecretDraftKey = `${providerId}:${strategy.id}:${key}`;
        const isPresent = strategy.presentKeys.includes(key);
        const isVisible = showSecrets[key];

        return (
          <div key={key}>
            <Label className="flex items-center gap-2 text-xs text-zinc-400 mb-1.5">
              {formatKeyLabel(key)}
              {isPresent && (
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                  Saved
                </span>
              )}
            </Label>
            <div className="relative">
              <Input
                type={isVisible ? 'text' : 'password'}
                value={secretDrafts[draftKey] ?? ''}
                onChange={(e) => setSecretDrafts(prev => ({ ...prev, [draftKey]: e.target.value }))}
                placeholder={isPresent ? '••••••••••••••••' : `Enter your ${formatKeyLabel(key)}`}
                className="pr-10 bg-zinc-900/50 border-zinc-800/60"
              />
              <button
                type="button"
                onClick={() => setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        );
      })}

      <div className={cn('flex items-center gap-2 pt-1', isMobile && 'flex-col')}>
        {isConnected ? (
          <div className="flex items-center gap-2 text-sm text-emerald-400">
            <Check className="h-4 w-4" />
            Connected and ready
          </div>
        ) : (
          <Button
            onClick={() => onSaveAndConnect(strategy.id, strategy.requiredKeys)}
            disabled={isSaving || isConnecting}
            className={cn('gap-2', isMobile && 'w-full')}
          >
            <Link2 className="h-4 w-4" />
            {isSaving ? 'Saving...' : isConnecting ? 'Connecting...' : strategy.configured ? 'Save & Connect' : 'Connect'}
          </Button>
        )}
      </div>
    </div>
  );
}

function formatKeyLabel(key: string): string {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();
}

