import { useCallback, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { Plus, Upload, Download, Trash2, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { showToast } from '../ui/toast';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import type { PromptEngineeringPreset, PromptEngineeringStore } from '../../types/promptEngineering';

export function PromptEngineeringModalHeader({
  isMobile,
  store,
  selectedId,
  isDirty,
  onSelectId,
  onCreate,
  onDelete,
  onImportFile,
  onExport,
  canExport,
  draftName,
  onDraftNameChange,
  onSetActive,
  canSetActive,
}: {
  isMobile: boolean;
  store: PromptEngineeringStore;
  selectedId: string | null;
  isDirty: boolean;
  onSelectId: (id: string) => void;
  onCreate: () => void;
  onDelete: () => void;
  onImportFile: (file: File) => Promise<void>;
  onExport: () => void;
  canExport: boolean;
  draftName: string;
  onDraftNameChange: (name: string) => void;
  onSetActive: () => void;
  canSetActive: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isActive = selectedId === store.activePresetId;

  const onFileChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        await onImportFile(file);
      } catch (err) {
        showToast({ message: err instanceof Error ? err.message : 'Import failed', type: 'error' });
      }

      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [onImportFile]
  );

  const headerRightPad = isMobile ? 'pr-12' : 'pr-14';

  
  return (
    <div className={cn('sticky top-0 z-10 border-b border-zinc-800/50 bg-zinc-950/90 backdrop-blur-md', headerRightPad)}>
      <div className="p-3 space-y-3">
        {/* Row 0: Title */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight text-zinc-100">Prompt Engineering</h2>
        </div>

        {/* Row 1: Preset selector + actions */}
        <div className="flex items-center gap-2">
          <Select
            value={selectedId ?? ''}
            onValueChange={(v) => {
              if (isDirty) {
                showToast({ message: 'Unsaved changes (save or discard)', type: 'warning' });
              }
              onSelectId(v);
            }}
          >
            <SelectTrigger className="h-8 flex-1 bg-zinc-900/50 border-zinc-800/60 text-sm">
              <SelectValue placeholder="Select preset..." />
            </SelectTrigger>
            <SelectContent className="bg-zinc-950 border-zinc-800">
              {store.presets.map((p: PromptEngineeringPreset) => (
                <SelectItem key={p.id} value={p.id}>
                  <span className={cn(p.id === store.activePresetId && 'font-medium')}>
                    {p.name}
                    {p.id === store.activePresetId && ' ✓'}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onCreate} title="New preset">
            <Plus className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => fileInputRef.current?.click()} title="Import">
            <Upload className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onExport} disabled={!canExport} title="Export">
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-red-400 hover:text-red-300" onClick={onDelete} disabled={!selectedId} title="Delete">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Row 2: Name edit + set active (only when preset selected) */}
        {selectedId && (
          <div className="flex items-center gap-2">
            <Input
              value={draftName}
              onChange={(e) => onDraftNameChange(e.target.value)}
              className="h-8 flex-1 bg-transparent border-zinc-800/60 text-sm font-medium"
              placeholder="Preset name"
            />
            <Button
              variant={isActive ? 'secondary' : 'outline'}
              size="sm"
              className="h-8 shrink-0 text-xs"
              onClick={onSetActive}
              disabled={!canSetActive || isActive}
            >
              <Check className="h-3 w-3 mr-1" />
              {isActive ? 'Active' : 'Use'}
            </Button>
          </div>
        )}
      </div>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={onFileChange}
      />
    </div>
  );
}
