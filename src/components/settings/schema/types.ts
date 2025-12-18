import type { LucideIcon } from 'lucide-react';

export type ControlType = 'select' | 'switch' | 'slider' | 'color' | 'text' | 'textarea' | 'svg-upload' | 'font-upload';

export interface SelectOption {
  value: string;
  label: string;
}

export interface ControlDefinition {
  type: ControlType;
  key: string;           // Path in config, e.g., 'typography.fontSize'
  label: string;
  description?: string;
  // For select
  options?: SelectOption[];
  // For slider
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  // For conditional display
  showWhen?: { key: string; value: unknown };
}

export interface ControlGroup {
  title?: string;
  icon?: LucideIcon;
  description?: string;
  showWhen?: { key: string; value: unknown };
  controls: ControlDefinition[];
}

export interface SectionDefinition {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
  groups: ControlGroup[];
}

export const sizeOptions: SelectOption[] = [
  { value: 'xs', label: 'Extra Small' },
  { value: 'sm', label: 'Small' },
  { value: 'md', label: 'Medium' },
  { value: 'lg', label: 'Large' },
];

export const gapOptions: SelectOption[] = [
  { value: 'none', label: 'None' },
  { value: 'tight', label: 'Tight' },
  { value: 'normal', label: 'Normal' },
  { value: 'spacious', label: 'Spacious' },
];

export const transitionOptions: SelectOption[] = [
  { value: 'none', label: 'None' },
  { value: 'fade', label: 'Fade' },
  { value: 'slide', label: 'Slide' },
];

// Helper to get a value from a nested object by dot path
export function getValueByPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((acc, part) => {
    if (acc && typeof acc === 'object' && part in acc) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj as unknown);
}

// Helper to set a value in a nested object by dot path
export function setValueByPath(obj: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const parts = path.split('.');
  const result = { ...obj };
  let current = result;
  
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    current[part] = { ...(current[part] as Record<string, unknown> || {}) };
    current = current[part] as Record<string, unknown>;
  }
  
  current[parts[parts.length - 1]] = value;
  return result;
}

