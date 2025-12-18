/**
 * AI Connection Dashboard
 * 
 * A full-featured dashboard for managing AI providers, models, costs, and logs.
 * Replaces the simple AiProvidersModal with a power-user focused interface.
 */

import { useState } from 'react';
import { Plug, Cpu, DollarSign, ScrollText } from 'lucide-react';
import { Dialog, DialogContent } from '../ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { useIsMobile } from '../../hooks/useIsMobile';
import { cn } from '../../lib/utils';
import { ProvidersTab } from './tabs/ProvidersTab';
import { ModelsTab } from './tabs/ModelsTab';
import { CostsTab } from './tabs/CostsTab';
import { LogsTab } from './tabs/LogsTab';
import { QuickActionsBar } from './QuickActionsBar';

interface AiDashboardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const tabs = [
  { id: 'providers', label: 'Providers', icon: Plug },
  { id: 'models', label: 'Models', icon: Cpu },
  { id: 'costs', label: 'Costs', icon: DollarSign },
  { id: 'logs', label: 'Logs', icon: ScrollText },
] as const;

type TabId = typeof tabs[number]['id'];

export function AiDashboard({ open, onOpenChange }: AiDashboardProps) {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<TabId>('providers');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        fullscreen={isMobile}
        className={cn(
          'p-0 overflow-hidden flex flex-col',
          !isMobile && 'h-[90vh] max-w-5xl'
        )}
      >
        {/* Header with Tabs */}
        <div className="shrink-0 border-b border-zinc-800/50 bg-zinc-950/90 backdrop-blur-md">
          <div className="flex items-center justify-between px-4 py-3">
            <h2 className="text-lg font-bold tracking-tight text-zinc-100">
              AI Dashboard
            </h2>
          </div>
          
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabId)}>
            <TabsList className={cn(
              'w-full justify-start rounded-none border-b border-zinc-800/30 bg-transparent px-4 pb-0',
              isMobile && 'overflow-x-auto'
            )}>
              {tabs.map(({ id, label, icon: Icon }) => (
                <TabsTrigger
                  key={id}
                  value={id}
                  className={cn(
                    'relative rounded-none border-b-2 border-transparent px-4 py-2.5',
                    'data-[state=active]:border-violet-500 data-[state=active]:bg-transparent',
                    'data-[state=active]:text-violet-400 data-[state=active]:shadow-none',
                    'hover:text-zinc-200 transition-colors',
                    isMobile && 'flex-1'
                  )}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden">
              <TabsContent value="providers" className="h-full m-0">
                <ProvidersTab isMobile={isMobile} />
              </TabsContent>
              
              <TabsContent value="models" className="h-full m-0">
                <ModelsTab isMobile={isMobile} />
              </TabsContent>
              
              <TabsContent value="costs" className="h-full m-0">
                <CostsTab isMobile={isMobile} />
              </TabsContent>
              
              <TabsContent value="logs" className="h-full m-0">
                <LogsTab isMobile={isMobile} />
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Quick Actions Bar - subtle, always visible */}
        <QuickActionsBar isMobile={isMobile} />
      </DialogContent>
    </Dialog>
  );
}

