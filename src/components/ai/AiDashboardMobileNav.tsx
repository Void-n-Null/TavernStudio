/**
 * AI Dashboard Mobile Navigation
 * 
 * Compact horizontal pill navigation for mobile views.
 */

import { Plug, Cpu, DollarSign, ScrollText } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { AiTabId } from './AiDashboardSidebar';

interface AiDashboardMobileNavProps {
  activeTab: AiTabId;
  onTabChange: (tab: AiTabId) => void;
}

const tabs = [
  { id: 'providers', label: 'Connections', icon: Plug },
  { id: 'models', label: 'Models', icon: Cpu },
  { id: 'costs', label: 'Costs', icon: DollarSign },
  { id: 'logs', label: 'Logs', icon: ScrollText },
] as const;

export function AiDashboardMobileNav({ activeTab, onTabChange }: AiDashboardMobileNavProps) {
  return (
    <nav className="flex gap-1.5 overflow-x-auto px-3 py-2 bg-zinc-950/80 border-b border-zinc-800/50 scrollbar-none shrink-0">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0',
            activeTab === tab.id
              ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
              : 'bg-zinc-800/50 text-zinc-400 border border-zinc-700/30 active:bg-zinc-700/50'
          )}
        >
          <tab.icon className="h-3.5 w-3.5" />
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}

