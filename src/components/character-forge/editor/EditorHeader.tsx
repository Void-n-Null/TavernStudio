import { memo } from 'react';
import { Save, X } from 'lucide-react';
import { Button } from '../../ui/button';
import { useCharacterEditorStore } from '../../../store/characterEditorStore';

interface EditorHeaderProps {
  isCreating: boolean;
  isSaving: boolean;
  isDirty: boolean;
  lastSavedAt: number | null;
  onSave: () => void;
  onClose: () => void;
}

const EditorTitle = memo(function EditorTitle({ isCreating }: { isCreating: boolean }) {
  const name = useCharacterEditorStore((s) => s.draft.data.name);
  return <>{isCreating ? 'Create Character' : `Edit: ${name || 'Unnamed'}`}</>;
});

export function EditorHeader({
  isCreating,
  isSaving,
  isDirty,
  lastSavedAt,
  onSave,
  onClose,
}: EditorHeaderProps) {
  return (
    <div className="flex shrink-0 items-center justify-between border-b border-zinc-800/50 bg-zinc-950/80 px-6 py-4">
      <div>
        <h2 className="text-xl font-bold text-zinc-100">
          <EditorTitle isCreating={isCreating} />
        </h2>
        <p className="mt-0.5 text-xs text-zinc-500">
          {isCreating ? 'Create a new character card' : 'Modify character properties'}
        </p>
      </div>
      
      <div className="flex items-center gap-3">
        {isSaving ? (
          <span className="text-xs text-violet-300">Saving…</span>
        ) : isDirty ? (
          <span className="text-xs text-amber-400">Unsaved changes</span>
        ) : lastSavedAt ? (
          <span className="text-xs text-zinc-500">Saved {new Date(lastSavedAt).toLocaleTimeString()}</span>
        ) : null}
        <Button
          onClick={onSave}
          disabled={isSaving}
          className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white"
        >
          <Save className="mr-1.5 h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
        <button
          onClick={onClose}
          className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

