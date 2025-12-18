import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { cn } from '../../lib/utils';
import type { PromptEngineeringPreset, PromptEngineeringMode } from '../../types/promptEngineering';
import { PromptEngineeringSystemTab } from './PromptEngineeringSystemTab';
import { PromptEngineeringInstructTab } from './PromptEngineeringInstructTab';
import { PromptEngineeringContextTab } from './PromptEngineeringContextTab';
import { PromptEngineeringOutputTab } from './PromptEngineeringReasoningTab';

export function PromptEngineeringPresetEditor({
  preset,
  onChange,
  isMobile,
}: {
  preset: PromptEngineeringPreset;
  onChange: (next: PromptEngineeringPreset) => void;
  isMobile: boolean;
}) {
  const setMode = (mode: PromptEngineeringMode) => onChange({ ...preset, mode });
  const isChat = preset.mode === 'chat';

  return (
    <div className="space-y-4">
      {/* Mode toggle - compact */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-zinc-800/40">
        <span className="text-xs text-zinc-500">Mode</span>
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-zinc-900/60 border border-zinc-800/50">
          <button
            type="button"
            onClick={() => setMode('chat')}
            className={cn(
              'px-3 py-1 rounded text-xs font-medium transition-colors',
              isChat ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
            )}
          >
            Chat
          </button>
          <button
            type="button"
            onClick={() => setMode('text')}
            className={cn(
              'px-3 py-1 rounded text-xs font-medium transition-colors',
              !isChat ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
            )}
          >
            Text
          </button>
        </div>
      </div>

      <Tabs defaultValue="structure" className="w-full">
        <TabsList className={cn(
          'w-full grid h-auto p-1 bg-zinc-900/40 border border-zinc-800/40 rounded-lg',
          isChat ? 'grid-cols-3' : 'grid-cols-4'
        )}>
          <TabsTrigger value="structure" className="py-2 text-xs data-[state=active]:bg-zinc-800 rounded">
            {isChat ? 'Layout' : 'Story'}
          </TabsTrigger>
          <TabsTrigger value="sysprompt" className="py-2 text-xs data-[state=active]:bg-zinc-800 rounded">
            System
          </TabsTrigger>
          {!isChat && (
            <TabsTrigger value="instruct" className="py-2 text-xs data-[state=active]:bg-zinc-800 rounded">
              Instruct
            </TabsTrigger>
          )}
          <TabsTrigger value="output" className="py-2 text-xs data-[state=active]:bg-zinc-800 rounded">
            Output
          </TabsTrigger>
        </TabsList>

        <div className="mt-4">
          <TabsContent value="structure" className="focus-visible:outline-none mt-0">
            <PromptEngineeringContextTab preset={preset} onChange={onChange} isMobile={isMobile} />
          </TabsContent>
          <TabsContent value="sysprompt" className="focus-visible:outline-none mt-0">
            <PromptEngineeringSystemTab preset={preset} onChange={onChange} isMobile={isMobile} />
          </TabsContent>
          {!isChat && (
            <TabsContent value="instruct" className="focus-visible:outline-none mt-0">
              <PromptEngineeringInstructTab preset={preset} onChange={onChange} />
            </TabsContent>
          )}
          <TabsContent value="output" className="focus-visible:outline-none mt-0">
            <PromptEngineeringOutputTab preset={preset} onChange={onChange} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
