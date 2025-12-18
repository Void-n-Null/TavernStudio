import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { useAiConnectionDebug } from './useAiConnectionDebug';
import { AuthStrategyCard } from './AuthStrategyCard';

/**
 * DEV-only panel to inspect/configure AI provider schemas + encrypted secrets on the server.
 *
 * Toggle with: A
 */
export function AiConnectionDebugPanel() {
  const [uiVisible, setUiVisible] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key.toLowerCase() !== 'a') return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      e.preventDefault();
      setUiVisible((v) => !v);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const {
    providersQuery,
    providers,
    selectedProviderId,
    setSelectedProviderId,
    selectedProvider,
    configDraft,
    setConfigDraft,
    secretDrafts,
    setSecretDrafts,
    setConfigMutation,
    setSecretsMutation,
    connectMutation,
    disconnectMutation,
  } = useAiConnectionDebug(uiVisible);

  if (!uiVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-[90] w-[520px] rounded-lg border border-zinc-700 bg-black/80 p-3 text-xs text-zinc-200 shadow-lg backdrop-blur">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-zinc-100">AI Connection Debug</div>
        <div className="flex items-center gap-2">
          <div className="text-[10px] text-zinc-400">[A] toggle</div>
          <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px]" onClick={() => setUiVisible(false)}>
            Hide
          </Button>
        </div>
      </div>

      {providersQuery.isLoading ? <div className="text-zinc-400">Loading providers…</div> : null}
      {providersQuery.error ? (
        <div className="text-red-400">Failed to load: {(providersQuery.error as Error).message}</div>
      ) : null}

      {selectedProvider ? (
        <div className="space-y-3">
          <div>
            <Label className="text-[11px] text-zinc-300">Provider</Label>
            <select
              className="mt-1 h-8 w-full rounded-md border border-zinc-700 bg-zinc-950/60 px-2 text-xs text-zinc-200 outline-none focus:border-zinc-500"
              value={selectedProviderId}
              onChange={(e) => setSelectedProviderId(e.target.value)}
            >
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label} ({p.id})
                </option>
              ))}
            </select>
            <div className="mt-1 text-[10px] text-zinc-400">
              Config: {selectedProvider.configValid ? 'valid' : 'invalid'} • Strategies:{' '}
              {selectedProvider.authStrategies.filter((s) => s.configured).length}/{selectedProvider.authStrategies.length}{' '}
              configured
            </div>
            <div className="mt-1 text-[10px] text-zinc-400">
              Status:{' '}
              <span className="text-zinc-200">
                {selectedProvider.connection?.status ?? 'disconnected'}
                {selectedProvider.connection?.auth_strategy_id ? ` (${selectedProvider.connection.auth_strategy_id})` : ''}
              </span>
              {selectedProvider.connection?.last_error ? (
                <span className="text-red-400"> • {selectedProvider.connection.last_error}</span>
              ) : null}
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <Label className="text-[11px] text-zinc-300">Config (JSON)</Label>
              <Button
                size="sm"
                variant="secondary"
                className="h-7 px-2 text-[10px]"
                disabled={setConfigMutation.isPending}
                onClick={() =>
                  setConfigMutation.mutate({
                    providerId: selectedProvider.id,
                    configText: configDraft,
                  })
                }
              >
                Save config
              </Button>
            </div>
            <textarea
              className="min-h-24 w-full resize-y rounded-md border border-zinc-700 bg-zinc-950/60 p-2 font-mono text-[11px] text-zinc-200 outline-none focus:border-zinc-500"
              value={configDraft}
              onChange={(e) => setConfigDraft(e.target.value)}
              spellCheck={false}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[11px] text-zinc-300">Auth strategies (encrypted secrets)</Label>

            {selectedProvider.authStrategies.map((s) => (
              <AuthStrategyCard
                key={s.id}
                providerId={selectedProvider.id}
                strategy={s}
                secretDrafts={secretDrafts}
                setSecretDrafts={setSecretDrafts}
                onConnect={(authStrategyId) =>
                  connectMutation.mutate({ providerId: selectedProvider.id, authStrategyId })
                }
                onDisconnect={() => disconnectMutation.mutate({ providerId: selectedProvider.id })}
                onSaveSecrets={(authStrategyId, secrets) =>
                  setSecretsMutation.mutate({ providerId: selectedProvider.id, authStrategyId, secrets })
                }
                isConnectPending={connectMutation.isPending}
                isDisconnectPending={disconnectMutation.isPending}
                isSaveSecretsPending={setSecretsMutation.isPending}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="text-zinc-400">No providers found.</div>
      )}
    </div>
  );
}
