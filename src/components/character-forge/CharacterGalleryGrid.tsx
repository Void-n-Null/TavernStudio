/**
 * CharacterGalleryGrid - Grid or list of character cards with filtering and sorting.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Upload, FileJson } from 'lucide-react';
import { useCharacterCards, useImportPngCard, useImportJsonCard, useDeleteCharacterCard, useUpdateCardTokenCount } from '../../hooks/queries/useCharacterCards';
import { useCharacterForgeStore } from '../../store/characterForgeStore';
import { CharacterCardTile } from './CharacterCardTile';
import { showToast } from '../ui/toast';
import { cn } from '../../lib/utils';
import { countOpenAiTokensManyOffThread } from '../../utils/tiktokenWorkerClient';

interface CharacterGalleryGridProps {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onEdit: (id: string) => void;
}

export function CharacterGalleryGrid({ selectedId, onSelect, onEdit }: CharacterGalleryGridProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isBatchImporting, setIsBatchImporting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const dragDepthRef = useRef(0);
  
  const { data: cards, isLoading, error } = useCharacterCards();
  const importPng = useImportPngCard();
  const importJson = useImportJsonCard();
  const deleteCard = useDeleteCharacterCard();
  const updateTokenCount = useUpdateCardTokenCount();

  const backfillRunningRef = useRef(false);
  const backfillSeenRef = useRef<Set<string>>(new Set());
  
  const {
    searchQuery,
    filterTags,
    sortBy,
    sortDirection,
    viewMode,
  } = useCharacterForgeStore();
  
  // Filter and sort
  const filteredCards = useMemo(() => {
    if (!cards) return [];
    
    let result = [...cards];
    
    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((card) => 
        card.name.toLowerCase().includes(q)
      );
    }
    
    // Tag filter (TODO: implement when tags are exposed in meta)
    // if (filterTags.length > 0) { ... }
    
    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'created_at':
          cmp = a.created_at - b.created_at;
          break;
        case 'updated_at':
        default:
          cmp = a.updated_at - b.updated_at;
          break;
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    
    return result;
  }, [cards, searchQuery, filterTags, sortBy, sortDirection]);

  const importFiles = async (files: File[]) => {
    const pngs = files.filter((f) => f.name.toLowerCase().endsWith('.png'));
    if (pngs.length === 0) {
      showToast({ message: 'No PNG files found', type: 'info' });
      return;
    }

    setIsBatchImporting(true);

    let imported = 0;
    let failed = 0;
    let firstError: string | null = null;
    let lastImportedId: string | null = null;

    for (const file of pngs) {
      try {
        const result = await importPng.mutateAsync(file);
        imported += 1;
        lastImportedId = result.id;
      } catch (err) {
        failed += 1;
        if (!firstError) firstError = err instanceof Error ? err.message : String(err);
      }
    }

    if (imported > 0 && lastImportedId) onSelect(lastImportedId);

    showToast({
      message: failed > 0 ? `Imported ${imported}, failed ${failed}. ${firstError ?? ''}`.trim() : `Imported ${imported}`,
      type: failed > 0 ? 'error' : 'success',
    });

    setIsBatchImporting(false);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    try {
      await importFiles(files);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    if (!cards || cards.length === 0) return;
    if (backfillRunningRef.current) return;

    const pending = cards.filter((c) => {
      if (backfillSeenRef.current.has(c.id)) return false;
      const missing = typeof c.token_count !== 'number';
      const stale = typeof c.token_count_updated_at === 'number' ? c.token_count_updated_at < c.updated_at : true;
      return missing || stale;
    });

    if (pending.length === 0) return;

    backfillRunningRef.current = true;
    let cancelled = false;

    const run = async () => {
      for (const meta of pending) {
        if (cancelled) break;

        try {
          const res = await fetch(`/api/character-cards/${meta.id}`);
          if (!res.ok) throw new Error('Failed to fetch character card');
          const full = (await res.json()) as { raw_json: string };

          let parsed: any = {};
          try {
            parsed = JSON.parse(full.raw_json);
          } catch {
            parsed = {};
          }

          const data = parsed?.data && typeof parsed.data === 'object' ? parsed.data : parsed;
          const first = (data?.first_mes ?? '') as string;
          const alts = Array.isArray(data?.alternate_greetings) ? (data.alternate_greetings as unknown[]).filter((x) => typeof x === 'string') : [];

          const counts = await countOpenAiTokensManyOffThread({
            description: String(data?.description ?? ''),
            personality: String(data?.personality ?? ''),
            scenario: String(data?.scenario ?? ''),
            greetings: [first, ...(alts as string[])].filter((x) => (x || '').trim()).join('\n\n'),
            examples: String(data?.mes_example ?? ''),
            system: String(data?.system_prompt ?? ''),
            postHistory: String(data?.post_history_instructions ?? ''),
            creatorNotes: String(data?.creator_notes ?? ''),
          });

          const total = Object.values(counts).reduce((a, b) => a + b, 0);
          await updateTokenCount.mutateAsync({ id: meta.id, token_count: total });

          // Only mark as seen after we successfully persist the computed value.
          backfillSeenRef.current.add(meta.id);
        } catch {
          // ignore; we'll retry next time the list changes / refreshes
        }
      }

      backfillRunningRef.current = false;
    };

    void run();

    return () => {
      cancelled = true;
      backfillRunningRef.current = false;
    };
  }, [cards, updateTokenCount]);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current += 1;
    setIsDragOver(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = 0;
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files ?? []);
    if (files.length === 0) return;
    await importFiles(files);
  };
  
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    
    try {
      await deleteCard.mutateAsync(id);
      showToast({ message: `Deleted "${name}"`, type: 'success' });
      if (selectedId === id) {
        onSelect(null);
      }
    } catch (err) {
      showToast({ 
        message: err instanceof Error ? err.message : 'Delete failed', 
        type: 'error' 
      });
    }
  };
  
  const handleDuplicate = (_id: string) => {
    // TODO: Implement duplicate functionality
    showToast({ message: 'Duplicate not yet implemented', type: 'info' });
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="text-sm text-zinc-500">Loading characters...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="text-sm text-red-400">Failed to load characters</div>
      </div>
    );
  }

  return (
    <div
      className="relative flex-1 overflow-y-auto p-3"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Import button at top */}
      <div className="mb-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png"
          multiple
          onChange={handleImport}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isBatchImporting || importPng.isPending || importJson.isPending}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-700 bg-zinc-900/50 px-3 py-2 text-xs text-zinc-400 transition-colors hover:border-zinc-600 hover:bg-zinc-900 hover:text-zinc-300 disabled:opacity-50"
        >
          <Upload className="h-4 w-4" />
          {isBatchImporting || importPng.isPending ? 'Importing…' : 'Import PNGs'}
        </button>
        <div className="mt-1 flex items-center justify-between text-[11px] text-zinc-600">
          <span>Tip: select multiple files, or drag/drop a folder</span>
          <span>
            {filteredCards.length}
            {cards ? ` / ${cards.length}` : ''}
          </span>
        </div>
      </div>

      {isDragOver && (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center bg-zinc-950/70">
          <div className="rounded-xl border border-zinc-700 bg-zinc-900/70 px-6 py-4 text-center">
            <div className="text-sm font-medium text-zinc-200">Drop PNGs to import</div>
            <div className="mt-1 text-xs text-zinc-400">Multiple files supported</div>
          </div>
        </div>
      )}
      
      {filteredCards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileJson className="mb-3 h-12 w-12 text-zinc-700" />
          <p className="text-sm text-zinc-500">
            {searchQuery ? 'No characters match your search' : 'No characters yet'}
          </p>
          <p className="mt-1 text-xs text-zinc-600">
            Import a character card or create a new one
          </p>
        </div>
      ) : (
        <div
          className={cn(
            viewMode === 'grid' 
              ? 'grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))]' 
              : 'flex flex-col gap-1'
          )}
        >
          {filteredCards.map((card, index) => (
            <CharacterCardTile
              key={card.id}
              card={card}
              isSelected={selectedId === card.id}
              viewMode={viewMode}
              index={index}
              onSelect={() => onSelect(card.id)}
              onEdit={() => onEdit(card.id)}
              onDuplicate={() => handleDuplicate(card.id)}
              onDelete={() => handleDelete(card.id, card.name)}
            />
          ))}
        </div>
      )}
      
      {/* CSS for animations */}
      <style>{`
        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

