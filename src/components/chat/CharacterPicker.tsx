/**
 * CharacterPicker - Multi-select character picker for chat creation.
 * 
 * Beautiful collectible card-style display with elegant selection states.
 */

import { useState, useMemo } from 'react';
import { Search, User, Check, Users, Sparkles } from 'lucide-react';
import { useCharacterCards, getAvatarUrlVersioned } from '../../hooks/queries/useCharacterCards';
import type { CharacterCardRecordMeta } from '../../types/characterCard';
import { cn } from '../../lib/utils';

interface CharacterPickerProps {
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  minSelection?: number;
  maxSelection?: number;
}

export function CharacterPicker({
  selectedIds,
  onSelectionChange,
  minSelection = 1,
  maxSelection,
}: CharacterPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: cards, isLoading, error } = useCharacterCards();

  const filteredCards = useMemo(() => {
    if (!cards) return [];
    if (!searchQuery.trim()) return cards;
    
    const q = searchQuery.toLowerCase();
    return cards.filter((card) =>
      card.name.toLowerCase().includes(q) ||
      card.creator?.toLowerCase().includes(q)
    );
  }, [cards, searchQuery]);

  const handleToggle = (cardId: string) => {
    const isSelected = selectedIds.includes(cardId);
    
    if (isSelected) {
      // Don't allow deselecting if we're at minimum
      if (selectedIds.length <= minSelection) return;
      onSelectionChange(selectedIds.filter((id) => id !== cardId));
    } else {
      // Don't allow selecting if we're at maximum
      if (maxSelection && selectedIds.length >= maxSelection) return;
      onSelectionChange([...selectedIds, cardId]);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/50">
        <div className="flex flex-col items-center gap-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
          <div className="text-sm text-zinc-500">Loading characters...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-xl border border-red-900/50 bg-red-950/20">
        <div className="text-sm text-red-400">Failed to load characters</div>
        <div className="text-xs text-zinc-500">Please try again later</div>
      </div>
    );
  }

  if (!cards || cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/30 p-8 text-center">
        <div className="mb-4 rounded-full bg-zinc-800/50 p-4">
          <Users className="h-8 w-8 text-zinc-600" />
        </div>
        <div className="text-sm font-medium text-zinc-400">No characters yet</div>
        <p className="mt-1 text-xs text-zinc-500">
          Import or create characters in the Character Forge first
        </p>
        <a
          href="/forge"
          className="mt-4 flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-500"
        >
          <Sparkles className="h-4 w-4" />
          Go to Character Forge
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          placeholder="Search characters..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900/80 py-2.5 pl-10 pr-4 text-sm text-zinc-200 placeholder-zinc-500 backdrop-blur-sm focus:border-violet-500/50 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
        />
      </div>

      {/* Selection info bar */}
      <div className="flex items-center justify-between rounded-lg bg-zinc-900/50 px-3 py-2">
        <div className="flex items-center gap-2 text-xs">
          <div className={cn(
            "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-medium",
            selectedIds.length > 0 
              ? "bg-violet-500/20 text-violet-300" 
              : "bg-zinc-800 text-zinc-500"
          )}>
            {selectedIds.length}
          </div>
          <span className="text-zinc-400">
            selected
            {minSelection > 0 && selectedIds.length < minSelection && (
              <span className="text-amber-400"> (need {minSelection - selectedIds.length} more)</span>
            )}
          </span>
        </div>
        {selectedIds.length > 0 && (
          <button
            onClick={() => onSelectionChange([])}
            className="text-xs text-zinc-500 transition-colors hover:text-zinc-300"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Character grid */}
      <div className="max-h-[420px] overflow-y-auto rounded-xl border border-zinc-800/50 bg-zinc-950/50 p-4">
        {filteredCards.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-sm text-zinc-500">
            No characters match "{searchQuery}"
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {filteredCards.map((card, index) => (
              <CharacterPickerCard
                key={card.id}
                card={card}
                isSelected={selectedIds.includes(card.id)}
                onToggle={() => handleToggle(card.id)}
                index={index}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface CharacterPickerCardProps {
  card: CharacterCardRecordMeta;
  isSelected: boolean;
  onToggle: () => void;
  index: number;
}

function CharacterPickerCard({ card, isSelected, onToggle, index }: CharacterPickerCardProps) {
  const [imgError, setImgError] = useState(false);

  const specLabel = card.spec 
    ? card.spec.replace('chara_card_', '').toUpperCase() 
    : 'V1';

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-xl border transition-all duration-200',
        isSelected
          ? 'border-violet-500/70 ring-2 ring-violet-500/30 shadow-lg shadow-violet-500/10'
          : 'border-zinc-800/80 hover:border-zinc-700 hover:shadow-xl hover:shadow-black/30'
      )}
      style={{
        animationDelay: `${index * 30}ms`,
        animation: 'fadeSlideIn 0.3s ease-out both',
        background: isSelected
          ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(30,30,35,1) 100%)'
          : 'linear-gradient(135deg, rgba(30,30,35,1) 0%, rgba(20,20,25,1) 100%)',
      }}
    >
      {/* Glow effect on hover */}
      <div 
        className={cn(
          "pointer-events-none absolute inset-0 transition-opacity duration-300",
          isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}
        style={{
          background: isSelected
            ? 'radial-gradient(ellipse at 50% 0%, rgba(139, 92, 246, 0.2), transparent 70%)'
            : 'radial-gradient(ellipse at 50% 0%, rgba(139, 92, 246, 0.1), transparent 70%)',
        }}
      />

      {/* Avatar */}
      <div className="relative aspect-[3/4] overflow-hidden bg-zinc-900">
        {card.has_png && !imgError ? (
          <img
            src={getAvatarUrlVersioned(card.id, card.png_sha256)}
            alt={card.name}
            className={cn(
              "h-full w-full object-cover transition-all duration-300",
              isSelected ? "scale-105" : "group-hover:scale-105"
            )}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-b from-zinc-800 to-zinc-900">
            <User className="h-12 w-12 text-zinc-700" />
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-zinc-950 to-transparent" />

        {/* Spec badge */}
        <div className="absolute right-1.5 top-1.5 rounded bg-zinc-950/70 px-1.5 py-0.5 text-[9px] font-medium text-zinc-400 backdrop-blur-sm">
          {specLabel}
        </div>

        {/* Selection indicator - subtle corner badge */}
        <div 
          className={cn(
            "absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full transition-all duration-200",
            isSelected 
              ? "bg-violet-500 scale-100 opacity-100" 
              : "bg-zinc-800/80 scale-75 opacity-0 group-hover:scale-100 group-hover:opacity-60"
          )}
        >
          <Check className={cn(
            "h-3 w-3 transition-colors",
            isSelected ? "text-white" : "text-zinc-400"
          )} />
        </div>
      </div>

      {/* Name */}
      <div className="relative p-2">
        <div className={cn(
          "truncate text-xs font-medium transition-colors",
          isSelected ? "text-violet-200" : "text-zinc-200"
        )}>
          {card.name}
        </div>
        {card.creator && (
          <div className="truncate text-[10px] text-zinc-500">
            {card.creator}
          </div>
        )}
      </div>

      {/* Selection ring animation */}
      {isSelected && (
        <div className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-violet-500/50 ring-offset-1 ring-offset-zinc-950" />
      )}

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
    </button>
  );
}
