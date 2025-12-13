/**
 * CharacterGalleryGrid - Grid or list of character cards with filtering and sorting.
 */

import { useMemo, useRef } from 'react';
import { Upload, FileJson } from 'lucide-react';
import { useCharacterCards, useImportPngCard, useDeleteCharacterCard } from '../../hooks/queries/useCharacterCards';
import { useCharacterForgeStore } from '../../store/characterForgeStore';
import { CharacterCardTile } from './CharacterCardTile';
import { showToast } from '../ui/toast';
import { cn } from '../../lib/utils';

interface CharacterGalleryGridProps {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onEdit: (id: string) => void;
}

export function CharacterGalleryGrid({ selectedId, onSelect, onEdit }: CharacterGalleryGridProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { data: cards, isLoading, error } = useCharacterCards();
  const importPng = useImportPngCard();
  const deleteCard = useDeleteCharacterCard();
  
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
  
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const result = await importPng.mutateAsync(file);
      showToast({ message: `Imported "${result.name}"`, type: 'success' });
      onSelect(result.id);
    } catch (err) {
      showToast({ 
        message: err instanceof Error ? err.message : 'Import failed', 
        type: 'error' 
      });
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
    <div className="flex-1 overflow-y-auto p-3">
      {/* Import button at top */}
      <div className="mb-3 flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png"
          onChange={handleImport}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={importPng.isPending}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-700 bg-zinc-900/50 px-3 py-2 text-xs text-zinc-400 transition-colors hover:border-zinc-600 hover:bg-zinc-900 hover:text-zinc-300 disabled:opacity-50"
        >
          <Upload className="h-4 w-4" />
          {importPng.isPending ? 'Importing...' : 'Import PNG'}
        </button>
      </div>
      
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
              ? 'grid grid-cols-2 gap-3' 
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

