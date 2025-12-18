import { useCallback } from 'react';
import { Info } from 'lucide-react';
import { Dialog, DialogContent } from '../ui/dialog';
import { showToast } from '../ui/toast';
import { useIsMobile } from '../../hooks/useIsMobile';
import { cn } from '../../lib/utils';
import { PromptEngineeringPresetEditor } from './PromptEngineeringPresetEditor';
import { PromptEngineeringModalHeader } from './PromptEngineeringModalHeader';
import { PromptEngineeringModalFooter } from './PromptEngineeringModalFooter';
import { usePromptEngineeringModalController } from './usePromptEngineeringModalController';
import { exportPresetAsFile } from './promptEngineeringFileUtils';

export function PromptEngineeringModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isMobile = useIsMobile();
  const c = usePromptEngineeringModalController(open);

  const handleExport = useCallback(() => {
    if (!c.draftPreset) return;
    const name = c.draftName.trim() || c.draftPreset.name;
    exportPresetAsFile({ ...c.draftPreset, name });
    showToast({ message: 'Exported preset', type: 'success' });
  }, [c.draftName, c.draftPreset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        fullscreen={isMobile}
        className={cn('p-0 overflow-hidden', !isMobile && 'h-[85vh]')}
      >
        <div className="flex h-full flex-col">
          <PromptEngineeringModalHeader
            isMobile={isMobile}
            store={c.store}
            selectedId={c.selectedId}
            isDirty={c.isDirty}
            onSelectId={(id) => c.selectPreset(id)}
            onCreate={() => {
              void c.createPreset().then(
                () => showToast({ message: 'Created preset', type: 'success' }),
                (e) => showToast({ message: e instanceof Error ? e.message : 'Create failed', type: 'error' })
              );
            }}
            onDelete={() => {
              void c.deleteSelectedPreset().then(
                () => showToast({ message: 'Deleted preset', type: 'success' }),
                (e) => showToast({ message: e instanceof Error ? e.message : 'Delete failed', type: 'error' })
              );
            }}
            onImportFile={c.importFile}
            onExport={handleExport}
            canExport={!!c.draftPreset}
            draftName={c.draftName}
            onDraftNameChange={c.setDraftName}
            onSetActive={() => {
              void c.setActiveSelected().then(
                () => showToast({ message: 'Set active preset', type: 'success' }),
                (e) => showToast({ message: e instanceof Error ? e.message : 'Failed', type: 'error' })
              );
            }}
            canSetActive={!!c.selectedPreset}
          />

          <div className={cn('flex-1 overflow-auto', isMobile ? 'p-3' : 'p-4')}>
            {/* Explanation Card */}
            <div className="mb-6 rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-4">
              <div className="flex items-start gap-3">
                <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400">
                  <Info className="h-4 w-4" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-zinc-200">What is this?</h3>
                  <p className="text-xs leading-relaxed text-zinc-400">
                    Prompt engineering is the blueprint for how the AI thinks and responds. It defines the character's voice, knowledge, and the rules of the world.
                  </p>
                  <div className="mt-3 grid gap-4 pt-3 border-t border-zinc-800/40 sm:grid-cols-2">
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">For Beginners</div>
                      <p className="text-[11px] text-zinc-500">Think of it as giving clear instructions to an actor playing a role. You're setting the scene and behavior.</p>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">For Veterans</div>
                      <p className="text-[11px] text-zinc-500">Fine-tune the system prompt, context layout, and instruct formatting to maximize model logic and coherence.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {c.isLoading ? (
              <div className="text-sm text-zinc-500">Loading…</div>
            ) : c.draftPreset ? (
              <PromptEngineeringPresetEditor
                preset={c.draftPreset}
                onChange={c.setDraftPreset}
                isMobile={isMobile}
              />
            ) : (
              <div className="text-sm text-zinc-500 p-4">
                No presets yet. Click + to create one.
              </div>
            )}
          </div>

          <PromptEngineeringModalFooter
            isMobile={isMobile}
            isDirty={c.isDirty}
            isSaving={c.isSaving}
            onDiscard={() => {
              c.discardDraft();
              showToast({ message: 'Discarded changes', type: 'info' });
            }}
            onSave={() => {
              void c.saveDraft().then(
                () => showToast({ message: 'Saved prompt preset', type: 'success' }),
                (e) => showToast({ message: e instanceof Error ? e.message : 'Save failed', type: 'error' })
              );
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
