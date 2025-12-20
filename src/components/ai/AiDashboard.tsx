/**
 * AI Connection Dashboard
 * 
 * A full-featured dashboard for managing AI providers, models, costs, and logs.
 * Replaces the simple AiProvidersModal with a power-user focused interface.
 */

import { useState, useMemo } from 'react';
import { Dialog, DialogContent } from '../ui/dialog';
import { useIsMobile } from '../../hooks/useIsMobile';
import { cn } from '../../lib/utils';
import { ProvidersTab } from './tabs/ProvidersTab';
import { ModelsTab } from './tabs/ModelsTab';
import { CostsTab } from './tabs/CostsTab';
import { LogsTab } from './tabs/LogsTab';
import { QuickActionsBar } from './QuickActionsBar';
import { AiDashboardSidebar, type AiTabId } from './AiDashboardSidebar';
import { AiDashboardMobileNav } from './AiDashboardMobileNav';
import { useActiveProfile } from '../../hooks/queries/profiles/queries';
import { useAiProvidersModalController } from './useAiProvidersModalController';
import { useUpdateProfile, useCreateAiConfig } from '../../hooks/queries/profiles/mutations';
import { showToast } from '../ui/toast';
import { useQueryClient } from '@tanstack/react-query';
import { resolveModelForProvider } from '../../utils/modelMapping';

interface AiDashboardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AiDashboard({ open, onOpenChange }: AiDashboardProps) {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<AiTabId>('providers');
  
  // Get active profile and its AI configs
  const { data: profile } = useActiveProfile();
  const { providers } = useAiProvidersModalController(open);
  const updateProfile = useUpdateProfile();
  const createAiConfig = useCreateAiConfig();

  const activeAiConfig = useMemo(() => 
    profile?.aiConfigs.find(c => c.id === profile.activeAiConfigId),
    [profile]
  );

  const activeProviderId = activeAiConfig?.providerId || null;
  const activeProviderLabel = useMemo(() => 
    providers.find(p => p.id === activeProviderId)?.label || null,
    [providers, activeProviderId]
  );

  const queryClient = useQueryClient();

  const handleActiveProviderChange = async (providerId: string) => {
    if (!profile) return;

    const currentModelId = profile.selectedModelId;
    
    // Check if the current global model can be mapped to the new provider
    const mappedModelId = await resolveModelForProvider(
      queryClient,
      providerId,
      currentModelId,
      activeProviderId || undefined
    );
    
    // Find if an AI config already exists for this provider
    const existingConfig = profile.aiConfigs.find(c => c.providerId === providerId);
    
    if (existingConfig) {
      updateProfile.mutate({
        id: profile.id,
        data: { activeAiConfigId: existingConfig.id }
      }, {
        onSuccess: () => {
          if (!mappedModelId && providerId !== 'openrouter') {
            showToast({ message: `Current model not available on ${providerId}. Please select a model.`, type: 'info' });
            setActiveTab('models');
          }
        }
      });
      showToast({ message: `Switched to ${providerId}`, type: 'success' });
    } else {
      // Find the provider info to get a default strategy
      const provider = providers.find(p => p.id === providerId);
      if (!provider) {
        showToast({ message: `Unknown provider: ${providerId}`, type: 'error' });
        return;
      }

      const strategy = provider.authStrategies.find(s => s.configured) || provider.authStrategies[0];
      
      createAiConfig.mutate({
        profileId: profile.id,
        data: {
          name: `${provider.label} Config`,
          providerId,
          authStrategyId: strategy.id,
          isDefault: true // This will also set it as active profile config
        }
      }, {
        onSuccess: () => {
          if (!mappedModelId && providerId !== 'openrouter') {
            showToast({ message: `Please select a model for ${provider.label}.`, type: 'info' });
            setActiveTab('models');
          }
        }
      });
      
      showToast({ message: `Configured and switched to ${provider.label}`, type: 'success' });
    }
  };

  const handleModelChange = (modelId: string) => {
    if (!profile) return;

    updateProfile.mutate({
      id: profile.id,
      data: { selectedModelId: modelId }
    });

    showToast({ message: `Global model updated to ${modelId}`, type: 'success' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        fullscreen={isMobile}
        className={cn(
          'p-0 gap-0 overflow-hidden flex flex-row',
          !isMobile && 'h-[90vh] max-w-6xl'
        )}
      >
        {!isMobile && (
          <AiDashboardSidebar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            providers={providers}
            activeProviderId={activeProviderId}
            onActiveProviderChange={handleActiveProviderChange}
            isMobile={false}
          />
        )}

        <div className="flex-1 flex flex-col min-w-0 bg-zinc-950/20">
          {/* Header */}
          <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-zinc-800/50 bg-zinc-950/50">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-zinc-100">
                {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
              </h2>
              {activeProviderId && (
                <p className="text-xs text-zinc-500 mt-0.5">
                  Currently using <span className="text-violet-400 font-medium">{activeProviderId}</span>
                </p>
              )}
            </div>
          </div>

          {isMobile && (
            <AiDashboardMobileNav
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
          )}

          {/* Main Content Area */}
          <main className="flex-1 overflow-hidden relative">
            <div className={cn(
              "h-full transition-all duration-200",
              activeTab === 'providers' ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4 pointer-events-none absolute inset-0"
            )}>
              <ProvidersTab
                isMobile={isMobile}
                activeProviderId={activeProviderId}
                onActiveProviderChange={handleActiveProviderChange}
                selectedModelId={profile?.selectedModelId || null}
                onSelectModel={handleModelChange}
              />
            </div>
            
            <div className={cn(
              "h-full transition-all duration-200",
              activeTab === 'models' ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4 pointer-events-none absolute inset-0"
            )}>
              <ModelsTab 
                isMobile={isMobile} 
                activeProviderId={activeProviderId} 
                activeProviderLabel={activeProviderLabel}
                selectedModelId={profile?.selectedModelId || null}
                onSelectModel={handleModelChange}
              />
            </div>
            
            <div className={cn(
              "h-full transition-all duration-200",
              activeTab === 'costs' ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4 pointer-events-none absolute inset-0"
            )}>
              <CostsTab isMobile={isMobile} activeProviderId={activeProviderId} />
            </div>
            
            <div className={cn(
              "h-full transition-all duration-200",
              activeTab === 'logs' ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4 pointer-events-none absolute inset-0"
            )}>
              <LogsTab isMobile={isMobile} activeProviderId={activeProviderId} />
            </div>
          </main>

          {/* Quick Actions Bar */}
          <QuickActionsBar isMobile={isMobile} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
