/**
 * Interface Design Schema - Data-driven configuration for message styling
 * 
 * This schema defines the UI for customizing how messages are displayed.
 * All controls are generated from this schema - to reorganize, just move items.
 * Templates can override defaults defined here.
 */

import type { SectionDefinition } from './schema/types';
import {
  customCssSection,
  headerSection,
  typographySection,
  layoutSection,
  composerSection,
  avatarSection,
  actionsSection,
  timestampsSection,
  animationSection,
  editingSection,
  markdownSection,
  backgroundSection,
} from './schema/sections';

// Re-export types and helpers
export * from './schema/types';

/**
 * All sections available in the interface design settings
 */
export const interfaceDesignSections: SectionDefinition[] = [
  customCssSection,
  headerSection,
  typographySection,
  layoutSection,
  composerSection,
  avatarSection,
  actionsSection,
  timestampsSection,
  animationSection,
  editingSection,
  markdownSection,
  backgroundSection,
];
