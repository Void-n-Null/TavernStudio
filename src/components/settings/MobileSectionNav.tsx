/**
 * MobileSectionNav - Horizontal scrolling section navigation for mobile
 * 
 * Replaces the sidebar on mobile with a compact horizontal pill navigation.
 */

import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useSettingsModalState } from '../../store/settingsModalState';

interface MobileSectionNavProps {
  allSections: Array<{
    id: string;
    label: string;
    icon: LucideIcon;
  }>;
}

export function MobileSectionNav({ allSections }: MobileSectionNavProps) {
  const activeSection = useSettingsModalState(s => s.activeSection);
  const setActiveSection = useSettingsModalState(s => s.setActiveSection);
  const setSearchQuery = useSettingsModalState(s => s.setSearchQuery);

  return (
    <nav className="flex gap-1.5 overflow-x-auto px-3 py-2 bg-zinc-950/80 border-b border-zinc-800/50 scrollbar-none">
      {allSections.map((section) => (
        <button
          key={section.id}
          onClick={() => {
            setActiveSection(section.id);
            setSearchQuery('');
          }}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0',
            activeSection === section.id
              ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
              : 'bg-zinc-800/50 text-zinc-400 border border-zinc-700/30 active:bg-zinc-700/50'
          )}
        >
          <section.icon className="h-3.5 w-3.5" />
          <span>{section.label}</span>
        </button>
      ))}
    </nav>
  );
}
