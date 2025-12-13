/**
 * Character card PNG storage "hygiene" knobs.
 *
 * Goals:
 * - Preserve user image fidelity by default (store original PNG bytes untouched).
 * - Provide safety limits to avoid accidental multi-hundred-MB imports.
 * - Keep all tunables in one place.
 */

export type OversizePolicy = 'accept' | 'reject';

export const CARD_PNG_HYGIENE = {
  /**
   * Maximum allowed size for an imported PNG (bytes).
   * If exceeded, `oversizePolicy` is applied.
   */
  maxOriginalBytes: 50 * 1024 * 1024, // 50 MiB

  /**
   * What to do if the imported PNG exceeds `maxOriginalBytes`.
   * - 'accept': store anyway
   * - 'reject': return 413
   */
  oversizePolicy: 'reject' as OversizePolicy,

  /**
   * Optional future knob: generate a derived preview image for UI performance.
   * Export should always use the original bytes.
   */
  generatePreview: false,

  /**
   * Optional future knob: normalize/re-encode the stored image.
   * Disabled by default to avoid reducing image quality on export.
   */
  normalizeStoredPng: false,

  // If normalization ever gets enabled:
  normalizeMaxDimension: 1024,
  normalizePngCompressionLevel: 6,
} as const;


