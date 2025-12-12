import { useStreamingDebug } from './useStreamingDebug';

export { useStreamingDebug } from './useStreamingDebug';

/**
 * @deprecated Use `useStreamingDebug()` instead.
 *
 * Kept for backwards compatibility with older imports.
 */
export function useStreamingDemo() {
  return useStreamingDebug();
}
