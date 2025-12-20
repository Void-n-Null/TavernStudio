import { useEffect, useMemo, useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { aiProviders, type AiProviderStatus } from '../../api/ai';
import { queryKeys } from '../../lib/queryClient';
import { showToast } from '../ui/toast';

export type SecretDraftKey = `${string}:${string}:${string}`; // providerId:strategyId:secretKey

export type AiProvidersModalController = {
  // Data
  providers: AiProviderStatus[];
  isLoading: boolean;
  
  // Selection
  selectedProviderId: string;
  selectedProvider: AiProviderStatus | undefined;
  selectProvider: (id: string) => void;
  
  // Auth strategy
  selectedStrategyId: string;
  setSelectedStrategyId: (id: string) => void;
  
  // Secret drafts
  secretDrafts: Record<SecretDraftKey, string>;
  setSecretDraft: (key: SecretDraftKey, value: string) => void;
  clearSecretDrafts: () => void;
  
  // Actions
  saveSecrets: (authStrategyId: string) => Promise<void>;
  connect: (authStrategyId: string) => Promise<void>;
  saveAndConnect: (authStrategyId: string) => Promise<void>;
  disconnect: () => Promise<void>;
  startPkce: () => Promise<void>;
  
  // Loading states
  isSaving: boolean;
  isConnecting: boolean;
  isDisconnecting: boolean;
};

export function useAiProvidersModalController(open: boolean): AiProvidersModalController {
  const queryClient = useQueryClient();

  const providersQuery = useQuery({
    queryKey: queryKeys.aiProviders.list(),
    queryFn: () => aiProviders.list().then((r) => r.providers),
    enabled: open,
  });

  const providers = providersQuery.data ?? [];

  // Selection state
  const [selectedProviderId, setSelectedProviderId] = useState<string>('openrouter');
  const selectedProvider = useMemo(
    () => providers.find((p) => p.id === selectedProviderId) ?? providers[0],
    [providers, selectedProviderId]
  );

  // Sync selection when providers load
  useEffect(() => {
    if (selectedProvider && selectedProvider.id !== selectedProviderId) {
      setSelectedProviderId(selectedProvider.id);
    }
  }, [providers.length, selectedProvider, selectedProviderId]);

  // Auth strategy selection
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>('');
  
  // Auto-select strategy when provider changes
  useEffect(() => {
    if (!selectedProvider) return;
    const activeStrategy = selectedProvider.connection?.auth_strategy_id;
    const defaultStrategy = selectedProvider.authStrategies.find(s => s.id === activeStrategy && s.configured)
      || selectedProvider.authStrategies.find(s => s.configured)
      || selectedProvider.authStrategies[0];
    setSelectedStrategyId(defaultStrategy?.id || '');
  }, [selectedProvider]);

  // Secret drafts
  const [secretDrafts, setSecretDrafts] = useState<Record<SecretDraftKey, string>>({});

  const setSecretDraft = useCallback((key: SecretDraftKey, value: string) => {
    setSecretDrafts((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearSecretDrafts = useCallback(() => {
    setSecretDrafts({});
  }, []);

  // Mutations
  const setSecretsMutation = useMutation({
    mutationFn: ({ providerId, authStrategyId, secrets }: { providerId: string; authStrategyId: string; secrets: Record<string, string> }) =>
      aiProviders.setSecrets(providerId, authStrategyId, secrets),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.aiProviders.list() });
    },
  });

  const connectMutation = useMutation({
    mutationFn: ({ providerId, authStrategyId }: { providerId: string; authStrategyId: string }) =>
      aiProviders.connect(providerId, authStrategyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.aiProviders.list() });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: (providerId: string) => aiProviders.disconnect(providerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.aiProviders.list() });
    },
  });

  const saveSecrets = useCallback(async (authStrategyId: string) => {
    if (!selectedProvider) return;
    
    // Filter drafts for this provider and strategy
    const prefix = `${selectedProvider.id}:${authStrategyId}:`;
    const secrets: Record<string, string> = {};
    Object.entries(secretDrafts).forEach(([key, value]) => {
      if (key.startsWith(prefix)) {
        const secretKey = key.slice(prefix.length);
        secrets[secretKey] = value;
      }
    });

    if (Object.keys(secrets).length === 0) return;

    try {
      await setSecretsMutation.mutateAsync({
        providerId: selectedProvider.id,
        authStrategyId,
        secrets,
      });
      showToast({ message: `Secrets saved for ${selectedProvider.label}`, type: 'success' });
      // Clear drafts for this specific combination
      setSecretDrafts(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(key => {
          if (key.startsWith(prefix)) delete next[key as SecretDraftKey];
        });
        return next;
      });
    } catch (e) {
      showToast({ message: e instanceof Error ? e.message : String(e), type: 'error' });
    }
  }, [selectedProvider, secretDrafts, setSecretsMutation]);

  const connect = useCallback(async (authStrategyId: string) => {
    if (!selectedProvider) return;
    try {
      await connectMutation.mutateAsync({
        providerId: selectedProvider.id,
        authStrategyId,
      });
      showToast({ message: `Connected to ${selectedProvider.label}`, type: 'success' });
    } catch (e) {
      showToast({ message: e instanceof Error ? e.message : String(e), type: 'error' });
    }
  }, [selectedProvider, connectMutation]);

  const saveAndConnect = useCallback(async (authStrategyId: string) => {
    await saveSecrets(authStrategyId);
    await connect(authStrategyId);
  }, [saveSecrets, connect]);

  const disconnect = useCallback(async () => {
    if (!selectedProvider) return;
    try {
      await disconnectMutation.mutateAsync(selectedProvider.id);
      showToast({ message: `Disconnected from ${selectedProvider.label}`, type: 'success' });
    } catch (e) {
      showToast({ message: e instanceof Error ? e.message : String(e), type: 'error' });
    }
  }, [selectedProvider, disconnectMutation]);

  // Model selection (persisted in localStorage for now)
  const startPkce = useCallback(async () => {
    try {
      const returnUrl = window.location.origin;
      const { authUrl } = await aiProviders.startOpenRouterPkce(returnUrl);
      window.location.href = authUrl;
    } catch (e) {
      showToast({ message: e instanceof Error ? e.message : String(e), type: 'error' });
    }
  }, []);

  return {
    providers,
    isLoading: providersQuery.isLoading,
    selectedProviderId,
    selectedProvider,
    selectProvider: setSelectedProviderId,
    selectedStrategyId,
    setSelectedStrategyId,
    secretDrafts,
    setSecretDraft,
    clearSecretDrafts,
    saveSecrets,
    connect,
    saveAndConnect,
    disconnect,
    startPkce,
    isSaving: setSecretsMutation.isPending,
    isConnecting: connectMutation.isPending,
    isDisconnecting: disconnectMutation.isPending,
  };
}
