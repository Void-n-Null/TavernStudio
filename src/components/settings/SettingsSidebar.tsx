import { startTransition } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { LucideIcon } from 'lucide-react';

interface SidebarSection {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface SidebarCategory {
  id: string;
  label: string;
  sections: SidebarSection[];
}

interface SettingsSidebarProps {
  categories: SidebarCategory[];
  activeSection: string;
  setActiveSection: (id: string) => void;
  setSearchExpanded: (expanded: boolean) => void;
  setSearchQuery: (query: string) => void;
}

export function SettingsSidebar({
  categories,
  activeSection,
  setActiveSection,
  setSearchExpanded,
  setSearchQuery,
}: SettingsSidebarProps) {
  return (
    <nav className="w-52 shrink-0 border-r border-zinc-800/50 bg-zinc-950/50 p-2 overflow-y-auto">
      {categories.map((category) => (
        <div key={category.id} className="mb-4 last:mb-0">
          <div className="px-3 mb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-600">
            {category.label}
          </div>
          <div className="space-y-0.5">
            {category.sections.map((section) => (
              <button
                key={section.id}
                onClick={() => {
                  startTransition(() => setActiveSection(section.id));
                  setSearchExpanded(false);
                  setSearchQuery('');
                }}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm transition-colors',
                  activeSection === section.id
                    ? 'bg-zinc-800/80 text-zinc-100 font-medium'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                )}
              >
                <section.icon className={cn(
                  "h-4 w-4 shrink-0",
                  activeSection === section.id ? "text-violet-400" : "text-zinc-500"
                )} />
                <span className="truncate flex-1 text-left">{section.label}</span>
                {activeSection === section.id && (
                  <ChevronRight className="h-3 w-3 text-zinc-600" />
                )}
              </button>
            ))}
          </div>
        </div>
      ))}
      
      <div className="mt-4 px-3 py-2 text-xs text-zinc-600">
        <div>↑↓ Navigate</div>
        <div>⌘K Search</div>
      </div>
    </nav>
  );
}

