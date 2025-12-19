import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../../lib/queryClient';
import { profiles } from '../../../api/profiles';

// ============ Queries ============

/** Fetch list of all profiles (metadata only) */
export function useProfileList() {
  return useQuery({
    queryKey: queryKeys.profiles.list(),
    queryFn: () => profiles.list(),
  });
}

/** Fetch single profile with full messageStyle */
export function useProfile(profileId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.profiles.detail(profileId ?? ''),
    queryFn: () => profiles.get(profileId!),
    enabled: !!profileId,
  });
}

/** Fetch the active/default profile */
export function useActiveProfile() {
  return useQuery({
    queryKey: queryKeys.profiles.active(),
    queryFn: () => profiles.getActive(),
  });
}
