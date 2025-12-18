/**
 * CharacterEditor - Full character card editing interface.
 * 
 * Supports both creating new cards and editing existing ones.
 */

import { useCallback, useEffect, useState } from 'react';
import { 
  useCharacterCard, 
  useUpdateCardAvatar,
  useDeleteCardAvatar,
  useImportPngCard,
  useImportJsonCard,
  getAvatarUrlVersioned,
  getExportPngUrl,
  getExportJsonUrl,
} from '../../hooks/queries/useCharacterCards';
import { showToast } from '../ui/toast';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { ImportExportBar } from './ImportExportBar';
import { extractCardFromPngFile } from '../../utils/cardPng';
import { getCharacterEditorDraftSnapshot, useCharacterEditorStore } from '../../store/characterEditorStore';
import { useCharacterEditorSave } from './hooks/useCharacterEditorSave';

// Extracted sub-components and utils
import type { EditorSection } from './editor/types';
import { normalizeToV2Card, createEmptyCard } from './editor/types';
import { EditorSectionNav } from './editor/EditorSectionNav';
import { EditorValidationBar } from './editor/EditorValidationBar';
import { EditorHeader } from './editor/EditorHeader';
import { EditorContent } from './editor/EditorContent';

interface CharacterEditorProps {
  cardId: string | null;
  onClose: () => void;
  onSaved: (id: string) => void;
}

export function CharacterEditor({ cardId, onClose, onSaved }: CharacterEditorProps) {
  const isCreating = !cardId;
  const [activeSection, setActiveSection] = useState<EditorSection>('core');
  
  // Confirmation states
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showAvatarDeleteConfirm, setShowAvatarDeleteConfirm] = useState(false);

  const isDirty = useCharacterEditorStore((s) => s.isDirty);
  const loadDraft = useCharacterEditorStore((s) => s.loadDraft);
  const replaceDraft = useCharacterEditorStore((s) => s.replaceDraft);
  
  const { handleSave, isSaving, lastSavedAt } = useCharacterEditorSave({ cardId, onSaved });

  // Queries
  const { data: existingCard, isLoading } = useCharacterCard(cardId);
  const updateAvatar = useUpdateCardAvatar();
  const deleteAvatar = useDeleteCardAvatar();
  const importPng = useImportPngCard();
  const importJson = useImportJsonCard();
  
  const getRawJson = useCallback(() => JSON.stringify(getCharacterEditorDraftSnapshot(), null, 2), []);

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

  // Avatar URL for display
  const avatarUrl =
    cardId && existingCard?.has_png ? getAvatarUrlVersioned(cardId, existingCard?.png_sha256) : null;
  
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

  const handleAvatarDelete = async () => {
    if (!cardId) return;
    try {
      await deleteAvatar.mutateAsync(cardId);
      showToast({ message: 'Avatar removed', type: 'success' });
    } catch (err) {
      showToast({
        message: err instanceof Error ? err.message : 'Avatar removal failed',
        type: 'error',
      });
    }
  };
  
  // Close with dirty check
  const handleClose = () => {
    if (isDirty) {
      setShowCloseConfirm(true);
    } else {
      onClose();
    }
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
      <ConfirmDialog
        open={showCloseConfirm}
        onOpenChange={setShowCloseConfirm}
        title="Unsaved Changes"
        description="You have unsaved changes. Are you sure you want to discard them and close?"
        confirmText="Discard and Close"
        onConfirm={onClose}
        variant="destructive"
      />

      <ConfirmDialog
        open={showAvatarDeleteConfirm}
        onOpenChange={setShowAvatarDeleteConfirm}
        title="Remove Avatar"
        description="Are you sure you want to remove the character avatar?"
        confirmText="Remove"
        onConfirm={handleAvatarDelete}
        variant="destructive"
      />

      <EditorHeader
        isCreating={isCreating}
        isSaving={isSaving}
        isDirty={isDirty}
        lastSavedAt={lastSavedAt}
        onSave={() => handleSave({ silent: false, reason: 'manual' })}
        onClose={handleClose}
      />
      
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
      
      <div className="flex flex-1 min-h-0">
        <EditorSectionNav activeSection={activeSection} setActiveSection={setActiveSection} />
        
        <EditorContent
          activeSection={activeSection}
          avatarUrl={avatarUrl}
          onAvatarChange={handleAvatarChange}
          onAvatarRemove={async () => {
            if (!cardId) {
              showToast({ message: 'Save the character first to manage the avatar', type: 'info' });
              return;
            }
            setShowAvatarDeleteConfirm(true);
          }}
          isAvatarActionLoading={updateAvatar.isPending || deleteAvatar.isPending}
        />
      </div>
    </div>
  );
}
