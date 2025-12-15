import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { showToast } from '../ui/toast';
import { useIsMobile } from '../../hooks/useIsMobile';
import { cn } from '../../lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  defaultPromptEngineeringStore,
  normalizePromptEngineeringStore,
  type PromptEngineeringPreset,
  type PromptEngineeringStore,
} from '../../types/promptEngineering';
import {
  useImportSillyTavernPromptEngineeringPreset,
  usePromptEngineeringStore,
  useSavePromptEngineeringStore,
} from '../../hooks/queries/usePromptEngineering';
import { PromptEngineeringPresetEditor } from './PromptEngineeringPresetEditor';

function makeId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return Math.random().toString(36).slice(2);
  }
}

function createEmptyPreset(name: string): PromptEngineeringPreset {
  const now = Date.now();
  return {
    id: makeId(),
    name,
    createdAt: now,
    updatedAt: now,
    source: 'manual',
  };
}

type ExportedPresetFileV1 = {
  type: 'tavernstudio.promptEngineeringPreset';
  version: 1;
  exportedAt: string;
  preset: PromptEngineeringPreset;
};

function exportPresetAsFile(preset: PromptEngineeringPreset) {
  const data: ExportedPresetFileV1 = {
    type: 'tavernstudio.promptEngineeringPreset',
    version: 1,
    exportedAt: new Date().toISOString(),
    preset,
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${preset.name.toLowerCase().replace(/\s+/g, '-')}-prompt-preset.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function PromptEngineeringModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isMobile = useIsMobile();

  const { data: storeData, isLoading } = usePromptEngineeringStore();
  const saveStore = useSavePromptEngineeringStore();
  const importSt = useImportSillyTavernPromptEngineeringPreset();

  const store: PromptEngineeringStore = useMemo(() => {
    return normalizePromptEngineeringStore(storeData ?? defaultPromptEngineeringStore());
  }, [storeData]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftPreset, setDraftPreset] = useState<PromptEngineeringPreset | null>(null);
  const [draftName, setDraftName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedPreset = useMemo(() => {
    if (!selectedId) return null;
    return store.presets.find((p) => p.id === selectedId) ?? null;
  }, [selectedId, store.presets]);

  useEffect(() => {
    if (!open) return;

    const first = store.activePresetId
      ? store.presets.find((p) => p.id === store.activePresetId) ?? store.presets[0]
      : store.presets[0];

    if (!first) {
      setSelectedId(null);
      setDraftPreset(null);
      setDraftName('');
      return;
    }

    setSelectedId(first.id);
  }, [open, store.activePresetId, store.presets]);

  useEffect(() => {
    if (!selectedPreset) {
      setDraftPreset(null);
      setDraftName('');
      return;
    }
    setDraftPreset(selectedPreset);
    setDraftName(selectedPreset.name);
  }, [selectedPreset]);

  const isDirty = useMemo(() => {
    if (!draftPreset || !selectedPreset) return false;
    if (draftName !== selectedPreset.name) return true;
    return JSON.stringify(draftPreset) !== JSON.stringify(selectedPreset);
  }, [draftName, draftPreset, selectedPreset]);

  const applySave = useCallback(async () => {
    if (!draftPreset) return;

    const nextPreset: PromptEngineeringPreset = {
      ...draftPreset,
      name: draftName.trim() || draftPreset.name,
      updatedAt: Date.now(),
    };

    const nextPresets = store.presets.map((p) => (p.id === nextPreset.id ? nextPreset : p));
    const existed = store.presets.some((p) => p.id === nextPreset.id);
    const finalPresets = existed ? nextPresets : [...store.presets, nextPreset];

    const nextStore: PromptEngineeringStore = {
      version: 1,
      activePresetId: selectedId ?? nextPreset.id,
      presets: finalPresets,
    };

    try {
      await saveStore.mutateAsync({ store: nextStore });
      showToast({ message: 'Saved prompt preset', type: 'success' });
    } catch (e) {
      showToast({ message: e instanceof Error ? e.message : 'Save failed', type: 'error' });
    }
  }, [draftName, draftPreset, saveStore, selectedId, store.presets]);

  const handleCreate = useCallback(async () => {
    const base = 'New Preset';
    const taken = new Set(store.presets.map((p) => p.name.toLowerCase()));
    let name = base;
    let i = 2;
    while (taken.has(name.toLowerCase())) {
      name = `${base} ${i}`;
      i++;
    }

    const preset = createEmptyPreset(name);
    const nextStore: PromptEngineeringStore = {
      version: 1,
      activePresetId: preset.id,
      presets: [...store.presets, preset],
    };

    try {
      await saveStore.mutateAsync({ store: nextStore });
      setSelectedId(preset.id);
      showToast({ message: 'Created preset', type: 'success' });
    } catch (e) {
      showToast({ message: e instanceof Error ? e.message : 'Create failed', type: 'error' });
    }
  }, [saveStore, store.presets]);

  const handleDelete = useCallback(async () => {
    if (!selectedPreset) return;

    const remaining = store.presets.filter((p) => p.id !== selectedPreset.id);
    const nextActive = remaining[0]?.id ?? null;

    const nextStore: PromptEngineeringStore = {
      version: 1,
      activePresetId: nextActive,
      presets: remaining,
    };

    try {
      await saveStore.mutateAsync({ store: nextStore });
      setSelectedId(nextActive);
      showToast({ message: 'Deleted preset', type: 'success' });
    } catch (e) {
      showToast({ message: e instanceof Error ? e.message : 'Delete failed', type: 'error' });
    }
  }, [saveStore, selectedPreset, store.presets]);

  const handleExport = useCallback(() => {
    if (!draftPreset) return;
    exportPresetAsFile({ ...draftPreset, name: draftName.trim() || draftPreset.name });
    showToast({ message: 'Exported preset', type: 'success' });
  }, [draftName, draftPreset]);

  const handleImportFile = useCallback(async (file: File) => {
    const text = await file.text();
    const json = JSON.parse(text) as unknown;

    if (
      json &&
      typeof json === 'object' &&
      (json as any).type === 'tavernstudio.promptEngineeringPreset' &&
      (json as any).version === 1 &&
      (json as any).preset &&
      typeof (json as any).preset === 'object'
    ) {
      const preset = (json as any).preset as PromptEngineeringPreset;
      const nextStore: PromptEngineeringStore = {
        version: 1,
        activePresetId: preset.id,
        presets: [...store.presets.filter((p) => p.id !== preset.id), preset],
      };

      await saveStore.mutateAsync({ store: nextStore });
      setSelectedId(preset.id);
      showToast({ message: 'Imported preset', type: 'success' });
      return;
    }

    await importSt.mutateAsync({ json });
    showToast({ message: 'Imported SillyTavern preset', type: 'success' });
  }, [importSt, saveStore, store.presets]);

  const onFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await handleImportFile(file);
    } catch (err) {
      showToast({ message: err instanceof Error ? err.message : 'Import failed', type: 'error' });
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [handleImportFile]);

  const headerRightPad = isMobile ? 'pr-12' : 'pr-14';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent fullscreen={isMobile} className="p-0">
        <div className="flex h-full flex-col">
          <div
            className={cn(
              'sticky top-0 z-10 border-b border-zinc-800/60 bg-zinc-950/90 backdrop-blur',
              headerRightPad
            )}
          >
            <div className={cn('p-4', isMobile ? 'space-y-3' : 'flex items-start justify-between gap-4')}>
              <div className="min-w-0">
                <div className="text-lg font-semibold text-zinc-100">Prompt Engineering</div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  Global, named formatting presets (import compatible).
                </div>
              </div>

              <div className={cn('flex gap-2', isMobile ? 'flex-col' : 'items-center')}>
                <div className={cn('flex gap-2', isMobile ? 'flex-col' : 'items-center')}>
                  <Select
                    value={selectedId ?? ''}
                    onValueChange={(v) => {
                      if (isDirty) {
                        showToast({ message: 'Unsaved changes (save or discard)', type: 'warning' });
                      }
                      setSelectedId(v);
                    }}
                  >
                    <SelectTrigger className={cn(isMobile ? 'w-full' : 'w-[260px]')}>
                      <SelectValue placeholder="Select preset" />
                    </SelectTrigger>
                    <SelectContent>
                      {store.presets.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button variant="secondary" onClick={handleCreate} type="button" className={cn(isMobile && 'w-full')}>
                    New
                  </Button>
                </div>

                <div className={cn('flex gap-2', isMobile ? 'flex-col' : 'items-center')}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/json,.json"
                    className="hidden"
                    onChange={onFileChange}
                  />

                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    type="button"
                    className={cn(isMobile && 'w-full')}
                  >
                    Import
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleExport}
                    type="button"
                    disabled={!draftPreset}
                    className={cn(isMobile && 'w-full')}
                  >
                    Export
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    type="button"
                    disabled={!selectedPreset}
                    className={cn(isMobile && 'w-full')}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className={cn('flex-1 overflow-auto', isMobile ? 'p-4' : 'p-6')}>
            {isLoading ? (
              <div className="text-sm text-zinc-500">Loading…</div>
            ) : draftPreset ? (
              <div className="space-y-4">
                <div className={cn('grid gap-3', isMobile ? 'grid-cols-1' : 'grid-cols-2')}>
                  <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/30 p-3 space-y-2">
                    <div className="text-sm font-medium text-zinc-200">Preset name</div>
                    <Input
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      placeholder="Preset name"
                    />
                    <div className="text-xs text-zinc-500">Shown in the preset picker.</div>
                  </div>

                  <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/30 p-3 space-y-2">
                    <div className="text-sm font-medium text-zinc-200">Active preset</div>
                    <div className="text-xs text-zinc-500">
                      The active preset is what future prompt systems will use by default.
                    </div>
                    <Button
                      variant="secondary"
                      type="button"
                      disabled={!selectedPreset}
                      onClick={async () => {
                        if (!selectedPreset) return;
                        const nextStore: PromptEngineeringStore = {
                          version: 1,
                          activePresetId: selectedPreset.id,
                          presets: store.presets,
                        };
                        try {
                          await saveStore.mutateAsync({ store: nextStore });
                          showToast({ message: 'Set active preset', type: 'success' });
                        } catch (e) {
                          showToast({ message: e instanceof Error ? e.message : 'Failed', type: 'error' });
                        }
                      }}
                      className={cn(isMobile && 'w-full')}
                    >
                      Set active
                    </Button>
                  </div>
                </div>

                <PromptEngineeringPresetEditor
                  preset={draftPreset}
                  onChange={setDraftPreset}
                  isMobile={isMobile}
                />
              </div>
            ) : (
              <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/30 p-5 text-sm text-zinc-500">
                No presets yet. Create one.
              </div>
            )}
          </div>

          <div className="sticky bottom-0 border-t border-zinc-800/60 bg-zinc-950/90 backdrop-blur">
            <div className={cn('p-4 flex gap-2', isMobile ? 'flex-col' : 'justify-end')}>
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  if (selectedPreset) {
                    setDraftPreset(selectedPreset);
                    setDraftName(selectedPreset.name);
                  }
                  showToast({ message: 'Discarded changes', type: 'info' });
                }}
                disabled={!isDirty}
                className={cn(isMobile && 'w-full')}
              >
                Discard
              </Button>
              <Button
                type="button"
                onClick={applySave}
                disabled={!isDirty || !draftPreset || saveStore.isPending}
                className={cn(isMobile && 'w-full')}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
