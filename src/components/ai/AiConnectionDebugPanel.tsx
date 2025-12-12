import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { aiProviders, type AiProviderStatus } from '../../api/client';
import { queryKeys } from '../../lib/queryClient';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { toast } from '../ui/toast';

type SecretDraftKey = `${string}:${string}:${string}`; // providerId:strategyId:secretKey

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return '{}';
  }
}

function parseJson(text: string): { ok: true; value: unknown } | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * DEV-only panel to inspect/configure AI provider schemas + encrypted secrets on the server.
 *
 * Toggle with: A
 */
export function AiConnectionDebugPanel() {
  const queryClient = useQueryClient();

  // Keep mounted for hotkey; hide UI by default.
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

  const providersQuery = useQuery({
    queryKey: queryKeys.aiProviders.list(),
    queryFn: () => aiProviders.list().then((r) => r.providers),
    enabled: uiVisible, // don’t spam the server if you never open the panel
  });

  const providers = providersQuery.data ?? [];

  const [selectedProviderId, setSelectedProviderId] = useState<string>('openrouter');
  const selectedProvider: AiProviderStatus | undefined = useMemo(
    () => providers.find((p) => p.id === selectedProviderId) ?? providers[0],
    [providers, selectedProviderId]
  );

  useEffect(() => {
    if (selectedProvider && selectedProvider.id !== selectedProviderId) {
      setSelectedProviderId(selectedProvider.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providers.length]);

  const [configDraft, setConfigDraft] = useState<string>('{}');
  useEffect(() => {
    if (!selectedProvider) return;
    setConfigDraft(safeStringify(selectedProvider.config));
  }, [selectedProvider?.id, selectedProvider?.config]);

  const [secretDrafts, setSecretDrafts] = useState<Record<SecretDraftKey, string>>({});

  const setConfigMutation = useMutation({
    mutationFn: async (args: { providerId: string; configText: string }) => {
      const parsed = parseJson(args.configText);
      if (!parsed.ok) throw new Error(`Invalid JSON: ${parsed.error}`);
      return await aiProviders.setConfig(args.providerId, parsed.value);
    },
    onSuccess: async () => {
      toast.success('Saved provider config');
      await queryClient.invalidateQueries({ queryKey: queryKeys.aiProviders.all });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  const setSecretsMutation = useMutation({
    mutationFn: async (args: { providerId: string; authStrategyId: string; secrets: Record<string, string> }) => {
      return await aiProviders.setSecrets(args.providerId, args.authStrategyId, args.secrets);
    },
    onSuccess: async () => {
      toast.success('Saved provider secrets (encrypted)');
      await queryClient.invalidateQueries({ queryKey: queryKeys.aiProviders.all });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  const connectMutation = useMutation({
    mutationFn: async (args: { providerId: string; authStrategyId: string }) => {
      return await aiProviders.connect(args.providerId, args.authStrategyId);
    },
    onSuccess: async () => {
      toast.success('Connected');
      await queryClient.invalidateQueries({ queryKey: queryKeys.aiProviders.all });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  const disconnectMutation = useMutation({
    mutationFn: async (args: { providerId: string }) => {
      return await aiProviders.disconnect(args.providerId);
    },
    onSuccess: async () => {
      toast.info('Disconnected');
      await queryClient.invalidateQueries({ queryKey: queryKeys.aiProviders.all });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  // Still mount for hotkey, but don’t render UI.
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

            {selectedProvider.authStrategies.map((s) => {
              return (
                <div key={s.id} className="rounded-md border border-zinc-800 bg-zinc-950/40 p-2">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-xs font-semibold text-zinc-100">
                      {s.label} <span className="text-[10px] text-zinc-500">({s.type})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-[10px] text-zinc-400">{s.configured ? 'configured' : 'not configured'}</div>
                      {selectedProvider.id === 'openrouter' && s.type === 'pkce' ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-7 px-2 text-[10px]"
                          onClick={async () => {
                            try {
                              const returnUrl = window.location.origin;
                              const { authUrl } = await aiProviders.startOpenRouterPkce(returnUrl);
                              window.location.href = authUrl;
                            } catch (e) {
                              toast.error(e instanceof Error ? e.message : String(e));
                            }
                          }}
                        >
                          Start PKCE
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-[10px]"
                        disabled={!s.configured || connectMutation.isPending}
                        onClick={() => connectMutation.mutate({ providerId: selectedProvider.id, authStrategyId: s.id })}
                      >
                        Connect
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-[10px]"
                        disabled={disconnectMutation.isPending}
                        onClick={() => disconnectMutation.mutate({ providerId: selectedProvider.id })}
                      >
                        Disconnect
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {s.requiredKeys.map((k) => {
                      const draftKey: SecretDraftKey = `${selectedProvider.id}:${s.id}:${k}`;
                      return (
                        <div key={k} className="col-span-2">
                          <Label className="text-[11px] text-zinc-300">
                            {k}{' '}
                            {s.presentKeys.includes(k) ? (
                              <span className="text-[10px] text-emerald-400">(present)</span>
                            ) : (
                              <span className="text-[10px] text-zinc-500">(missing)</span>
                            )}
                          </Label>
                          <Input
                            className="h-8 text-xs"
                            type="password"
                            value={secretDrafts[draftKey] ?? ''}
                            placeholder={k}
                            onChange={(e) =>
                              setSecretDrafts((prev) => ({
                                ...prev,
                                [draftKey]: e.target.value,
                              }))
                            }
                          />
                        </div>
                      );
                    })}

                    <div className="col-span-2 flex justify-end">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-7 px-2 text-[10px]"
                        disabled={setSecretsMutation.isPending}
                        onClick={() => {
                          const secrets: Record<string, string> = {};
                          for (const k of s.requiredKeys) {
                            const dk: SecretDraftKey = `${selectedProvider.id}:${s.id}:${k}`;
                            const v = (secretDrafts[dk] ?? '').trim();
                            if (v) secrets[k] = v;
                          }
                          if (Object.keys(secrets).length === 0) {
                            toast.warning('No secrets entered');
                            return;
                          }
                          setSecretsMutation.mutate({
                            providerId: selectedProvider.id,
                            authStrategyId: s.id,
                            secrets,
                          });
                        }}
                      >
                        Save secrets
                      </Button>
                    </div>
                  </div>

                  <div className="mt-2 text-[10px] text-zinc-500">
                    Secrets are stored encrypted in SQLite. Provide `TAVERN_MASTER_KEY_B64` in production.
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-zinc-400">No providers found.</div>
      )}
    </div>
  );
}

