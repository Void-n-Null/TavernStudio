import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../lib/queryClient';
import type { Profile } from '../../../types/profile';
import type { MessageStyleConfig } from '../../../types/messageStyle';
import { applyMessageStyleDefaults } from '../../../types/messageStyle';
import { useActiveProfile } from './queries';
import { useUpdateProfile } from './mutations';

// ============ Convenience Hooks ============

/**
 * Main hook for working with the active profile's message styles.
 * Provides the current config and section-level update functions.
 */
export function useActiveMessageStyle() {
  const { data: profile, isLoading, error } = useActiveProfile();
  const queryClient = useQueryClient();
  const updateMutation = useUpdateProfile();

  const config = profile?.messageStyle ? applyMessageStyleDefaults(profile.messageStyle) : undefined;

  // Helper to update a section of the config
  const updateConfig = (updates: Partial<MessageStyleConfig>) => {
    if (!profile) return;

    // Base merge off the latest cached active profile to avoid stale-write clobbering
    // when multiple controls are changed quickly.
    const cachedActive = queryClient.getQueryData<Profile>(queryKeys.profiles.active());
    const base = applyMessageStyleDefaults(cachedActive?.messageStyle ?? profile.messageStyle);

    const next: MessageStyleConfig = { ...base };
    for (const [k, v] of Object.entries(updates as Record<string, unknown>)) {
      const baseVal = (base as any)[k];
      if (v && typeof v === 'object' && !Array.isArray(v) && baseVal && typeof baseVal === 'object' && !Array.isArray(baseVal)) {
        (next as any)[k] = { ...baseVal, ...(v as any) };
      } else {
        (next as any)[k] = v as any;
      }
    }

    return updateMutation.mutateAsync({
      id: profile.id,
      data: { messageStyle: next },
    });
  };

  // Section-level update functions matching the old zustand interface
  const setTypography = (typography: Partial<MessageStyleConfig['typography']>) => {
    if (!config) return;
    return updateConfig({
      typography: { ...config.typography, ...typography },
    });
  };

  const setLayout = (layout: Partial<MessageStyleConfig['layout']>) => {
    if (!config) return;
    return updateConfig({
      layout: { ...config.layout, ...layout },
    });
  };

  const setAvatar = (avatar: Partial<MessageStyleConfig['avatar']>) => {
    if (!config) return;
    return updateConfig({
      avatar: { ...config.avatar, ...avatar },
    });
  };

  const setActions = (actions: Partial<MessageStyleConfig['actions']>) => {
    if (!config) return;
    return updateConfig({
      actions: { ...config.actions, ...actions },
    });
  };

  const setBranch = (branch: Partial<MessageStyleConfig['branch']>) => {
    if (!config) return;
    return updateConfig({
      branch: { ...config.branch, ...branch },
    });
  };

  const setTimestamp = (timestamp: Partial<MessageStyleConfig['timestamp']>) => {
    if (!config) return;
    return updateConfig({
      timestamp: { ...config.timestamp, ...timestamp },
    });
  };

  const setAnimation = (animation: Partial<MessageStyleConfig['animation']>) => {
    if (!config) return;
    return updateConfig({
      animation: { ...config.animation, ...animation },
    });
  };

  const setEdit = (edit: Partial<MessageStyleConfig['edit']>) => {
    if (!config) return;
    return updateConfig({
      edit: { ...config.edit, ...edit },
    });
  };

  const setPageBackground = (pageBackground: Partial<MessageStyleConfig['pageBackground']>) => {
    if (!config) return;
    return updateConfig({
      pageBackground: { ...config.pageBackground, ...pageBackground },
    });
  };

  const setMessageListBackground = (messageListBackground: Partial<MessageStyleConfig['messageListBackground']>) => {
    if (!config) return;
    return updateConfig({
      messageListBackground: { ...config.messageListBackground, ...messageListBackground },
    });
  };

  const resetConfig = async () => {
    if (!profile) return;
    const { defaultMessageStyleConfig } = await import('../../../types/messageStyle');
    return updateMutation.mutateAsync({
      id: profile.id,
      data: { messageStyle: defaultMessageStyleConfig },
    });
  };

  return {
    profile,
    config,
    isLoading,
    error,
    isPending: updateMutation.isPending,

    // Update functions
    setTypography,
    setLayout,
    setAvatar,
    setActions,
    setBranch,
    setTimestamp,
    setAnimation,
    setEdit,
    setPageBackground,
    setMessageListBackground,
    resetConfig,
    updateConfig,
  };
}
