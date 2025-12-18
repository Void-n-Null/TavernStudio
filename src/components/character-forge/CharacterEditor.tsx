/**
 * CharacterEditor - Full character card editing interface.
 * 
 * Supports both creating new cards and editing existing ones.
 */

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { X, Save } from 'lucide-react';
import { 
  useCharacterCard, 
  useCreateCharacterCard, 
  useUpdateCharacterCard,
  useUpdateCardAvatar,
  useDeleteCardAvatar,
  useImportPngCard,
  useImportJsonCard,
  getAvatarUrlVersioned,
  getExportPngUrl,
  getExportJsonUrl,
} from '../../hooks/queries/useCharacterCards';
import { Button } from '../ui/button';
import { showToast } from '../ui/toast';
import { validateCharacterCard } from './ValidationBadge';
import { ImportExportBar } from './ImportExportBar';
import { AvatarSection } from './sections/AvatarSection';
import { extractCardFromPngFile } from '../../utils/cardPng';
import { getCharacterEditorDraftSnapshot, useCharacterEditorStore } from '../../store/characterEditorStore';

// Extracted sub-components and utils
import type { EditorSection } from './editor/types';
import { normalizeToV2Card, createEmptyCard } from './editor/types';
import { EditorSectionNav } from './editor/EditorSectionNav';
import { EditorValidationBar } from './editor/EditorValidationBar';
import { EditorInsightsSidebar } from './editor/EditorInsightsSidebar';
import {
  CoreSectionFields,
  GreetingsSectionFields,
  ExamplesSectionFields,
  PromptsSectionFields,
  MetadataSectionFields,
  NoteSectionFields
} from './editor/SectionFields';

interface CharacterEditorProps {
  cardId: string | null;
  onClose: () => void;
  onSaved: (id: string) => void;
}

export function CharacterEditor({ cardId, onClose, onSaved }: CharacterEditorProps) {
  const isCreating = !cardId;
  const [activeSection, setActiveSection] = useState<EditorSection>('core');
  const autosaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const idleSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  const isDirty = useCharacterEditorStore((s) => s.isDirty);
  const loadDraft = useCharacterEditorStore((s) => s.loadDraft);
  const replaceDraft = useCharacterEditorStore((s) => s.replaceDraft);
  const markSavedIfVersionMatches = useCharacterEditorStore((s) => s.markSavedIfVersionMatches);
  
  // Queries
  const { data: existingCard, isLoading } = useCharacterCard(cardId);
  const createCard = useCreateCharacterCard();
  const updateCard = useUpdateCharacterCard();
  const updateAvatar = useUpdateCardAvatar();
  const deleteAvatar = useDeleteCardAvatar();
  const importPng = useImportPngCard();
  const importJson = useImportJsonCard();

  useEffect(() => {
    if (existingCard?.updated_at) setLastSavedAt(existingCard.updated_at);
  }, [existingCard?.updated_at]);
  
  // Load existing card data into the draft store.
  useEffect(() => {
    if (!cardId) {
      loadDraft(null, createEmptyCard());
      return;
    }

    if (existingCard && existingCard.raw_json) {
      try {
        const parsed = JSON.parse(existingCard.raw_json);
        loadDraft(cardId, normalizeToV2Card(parsed));
      } catch {
        loadDraft(cardId, createEmptyCard());
      }
    }
  }, [cardId, existingCard, loadDraft]);
  
  const getRawJson = useCallback(() => JSON.stringify(getCharacterEditorDraftSnapshot(), null, 2), []);

  // Avatar URL for display
  const avatarUrl =
    cardId && existingCard?.has_png ? getAvatarUrlVersioned(cardId, existingCard?.png_sha256) : null;
  
  // Save handler
  const handleSave = useCallback(async (opts?: { silent?: boolean; reason?: 'manual' | 'autosave' | 'hotkey' }) => {
    const silent = Boolean(opts?.silent);
    const saveDirtyVersion = useCharacterEditorStore.getState().dirtyVersion;
    const draft = getCharacterEditorDraftSnapshot();
    const validationMessages = validateCharacterCard(draft);
    const hasErrors = validationMessages.some((m) => m.level === 'error');
    if (hasErrors) {
      if (!silent) showToast({ message: 'Please fix errors before saving', type: 'error' });
      return;
    }
    
    try {
      if (isCreating) {
        const result = await createCard.mutateAsync(draft);
        if (!silent) showToast({ message: 'Character created', type: 'success' });
        // In create mode, we navigate to edit and remount anyway, but keep semantics correct.
        markSavedIfVersionMatches(saveDirtyVersion);
        setLastSavedAt(Date.now());
        onSaved(result.id);
      } else {
        await updateCard.mutateAsync({ id: cardId, card: draft });
        if (!silent) showToast({ message: 'Character saved', type: 'success' });
        // Only clear dirty if nothing changed while the save was in-flight.
        markSavedIfVersionMatches(saveDirtyVersion);
        setLastSavedAt(Date.now());
        onSaved(cardId);
      }
    } catch (err) {
      // Autosave should not spam; only show toast on failure.
      showToast({
        message: err instanceof Error ? err.message : 'Save failed',
        type: 'error',
      });
    }
  }, [cardId, createCard, isCreating, markSavedIfVersionMatches, onSaved, updateCard]);

  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;

  const pendingRef = useRef(false);
  pendingRef.current = Boolean(createCard.isPending || updateCard.isPending);

  // Ctrl/Cmd+S save hotkey (override browser default)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isSave = (e.key === 's' || e.key === 'S') && (e.ctrlKey || e.metaKey);
      if (!isSave) return;
      e.preventDefault();
      e.stopPropagation();

      // Don't enqueue multiple saves.
      if (createCard.isPending || updateCard.isPending) return;
      void handleSave({ silent: false, reason: 'hotkey' });
    };

    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true } as any);
  }, [createCard.isPending, handleSave, updateCard.isPending]);

  // Autosave scheduling (store-driven; avoids React rerender coupling to draft changes).
  useEffect(() => {
    const clearIdle = () => {
      if (idleSaveTimerRef.current) clearTimeout(idleSaveTimerRef.current);
      idleSaveTimerRef.current = null;
    };

    const scheduleIdle = () => {
      clearIdle();
      idleSaveTimerRef.current = setTimeout(() => {
        const state = useCharacterEditorStore.getState();
        if (!state.isDirty) return;
        if (pendingRef.current) return;
        void handleSaveRef.current({ silent: true, reason: 'autosave' });
      }, 2_000);
    };

    const unsub = useCharacterEditorStore.subscribe(
      (s) => s.dirtyVersion,
      () => {
        // Any edit should push autosave out.
        scheduleIdle();
      }
    );

    if (autosaveTimerRef.current) clearInterval(autosaveTimerRef.current);
    autosaveTimerRef.current = setInterval(() => {
      const state = useCharacterEditorStore.getState();
      if (!state.isDirty) return;
      if (pendingRef.current) return;
      void handleSaveRef.current({ silent: true, reason: 'autosave' });
    }, 60_000);

    const onVisibilityChange = () => {
      if (document.visibilityState !== 'hidden') return;
      const state = useCharacterEditorStore.getState();
      if (!state.isDirty) return;
      if (pendingRef.current) return;
      void handleSaveRef.current({ silent: true, reason: 'autosave' });
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      unsub();
      clearIdle();
      if (autosaveTimerRef.current) clearInterval(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);
  
  // Avatar upload
  const handleAvatarChange = async (file: File) => {
    if (!cardId) {
      showToast({ message: 'Save the character first to upload an avatar', type: 'info' });
      return;
    }
    
    try {
      await updateAvatar.mutateAsync({ id: cardId, file });
      showToast({ message: 'Avatar updated', type: 'success' });
    } catch (err) {
      showToast({ 
        message: err instanceof Error ? err.message : 'Avatar upload failed', 
        type: 'error' 
      });
    }
  };
  
  // Close with dirty check
  const handleClose = () => {
    if (isDirty) {
      if (!confirm('You have unsaved changes. Discard them?')) {
        return;
      }
    }
    onClose();
  };

  if (isLoading && cardId) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-sm text-zinc-500">Loading character...</div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-zinc-950/50">
      {/* Header */}
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
          {createCard.isPending || updateCard.isPending ? (
            <span className="text-xs text-violet-300">Saving…</span>
          ) : isDirty ? (
            <span className="text-xs text-amber-400">Unsaved changes</span>
          ) : lastSavedAt ? (
            <span className="text-xs text-zinc-500">Saved {new Date(lastSavedAt).toLocaleTimeString()}</span>
          ) : null}
          <Button
            onClick={() => handleSave({ silent: false, reason: 'manual' })}
            disabled={createCard.isPending || updateCard.isPending}
            className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white"
          >
            <Save className="mr-1.5 h-4 w-4" />
            {createCard.isPending || updateCard.isPending ? 'Saving...' : 'Save'}
          </Button>
          <button
            onClick={handleClose}
            className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
      
      {/* Import/Export bar */}
      <div className="shrink-0 border-b border-zinc-800/50 bg-zinc-950/60 px-6 py-2">
        <ImportExportBar
          cardId={cardId}
          hasPng={existingCard?.has_png ?? false}
          getRawJson={getRawJson}
          onImportPng={async (file) => {
            if (!cardId) {
              const result = await importPng.mutateAsync(file);
              showToast({ message: `Imported "${result.name}"`, type: 'success' });
              onSaved(result.id);
              return;
            }

            const extracted = await extractCardFromPngFile(file);
            if (!extracted.ok) {
              throw new Error(extracted.error);
            }

            replaceDraft(normalizeToV2Card(extracted.json), { markDirty: true });
            await updateAvatar.mutateAsync({ id: cardId, file });
            showToast({ message: 'PNG loaded into editor', type: 'success' });
          }}
          onImportJson={async (json) => {
            if (!cardId) {
              const result = await importJson.mutateAsync(json);
              showToast({ message: `Imported "${result.name}"`, type: 'success' });
              onSaved(result.id);
              return;
            }

            replaceDraft(normalizeToV2Card(json), { markDirty: true });
            showToast({ message: 'JSON loaded into editor', type: 'success' });
          }}
          onExportPng={() => {
            if (cardId) window.open(getExportPngUrl(cardId), '_blank');
          }}
          onExportJson={() => {
            if (cardId) window.open(getExportJsonUrl(cardId), '_blank');
          }}
          isImporting={updateAvatar.isPending || importPng.isPending || importJson.isPending}
        />
      </div>
      
      <EditorValidationBar />
      
      {/* Main content - sidebar + content */}
      <div className="flex flex-1 min-h-0">
        <EditorSectionNav activeSection={activeSection} setActiveSection={setActiveSection} />
        
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto w-full max-w-5xl">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="min-w-0">
                {activeSection === 'core' && (
                  <div className="space-y-6">
                    <AvatarSection
                      avatarUrl={avatarUrl}
                      onAvatarChange={handleAvatarChange}
                      onAvatarRemove={async () => {
                        if (!cardId) {
                          showToast({ message: 'Save the character first to manage the avatar', type: 'info' });
                          return;
                        }
                        if (!confirm('Remove avatar?')) return;
                        try {
                          await deleteAvatar.mutateAsync(cardId);
                          showToast({ message: 'Avatar removed', type: 'success' });
                        } catch (err) {
                          showToast({
                            message: err instanceof Error ? err.message : 'Avatar removal failed',
                            type: 'error',
                          });
                        }
                      }}
                      isUploading={updateAvatar.isPending || deleteAvatar.isPending}
                    />

                    <CoreSectionFields />
                  </div>
                )}
                
                {activeSection === 'greetings' && <GreetingsSectionFields />}
                {activeSection === 'examples' && <ExamplesSectionFields />}
                {activeSection === 'prompts' && <PromptsSectionFields />}
                {activeSection === 'metadata' && <MetadataSectionFields />}
                {activeSection === 'note' && <NoteSectionFields />}
              </div>

              <aside className="space-y-4 lg:sticky lg:top-4 self-start">
                <EditorInsightsSidebar />
              </aside>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const EditorTitle = memo(function EditorTitle({ isCreating }: { isCreating: boolean }) {
  const name = useCharacterEditorStore((s) => s.draft.data.name);
  return <>{isCreating ? 'Create Character' : `Edit: ${name || 'Unnamed'}`}</>;
});
