import { useState, useCallback } from 'react';
import { GripVertical, ChevronUp, ChevronDown, Lock } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { PromptLayout, PromptBlock, PromptBlockId } from '../../lib/promptLayout';
import { reorderBlocks, toggleBlock } from '../../lib/promptLayout';

type BlockCategory = 'prompt' | 'character' | 'user' | 'lore' | 'dialogue';

const CATEGORY_COLORS: Record<BlockCategory, string> = {
  prompt: 'bg-violet-500',
  character: 'bg-emerald-500',
  user: 'bg-sky-500',
  lore: 'bg-amber-500',
  dialogue: 'bg-zinc-400',
};

function getBlockCategory(id: PromptBlockId): BlockCategory {
  switch (id) {
    case 'system_prompt':
    case 'post_history':
    case 'prefill':
      return 'prompt';
    case 'char_description':
    case 'char_personality':
    case 'scenario':
      return 'character';
    case 'persona':
      return 'user';
    case 'world_info_before':
    case 'world_info_after':
      return 'lore';
    case 'example_dialogue':
    case 'chat_history':
    default:
      return 'dialogue';
  }
}

function getBlockDotColor(id: PromptBlockId): string {
  return CATEGORY_COLORS[getBlockCategory(id)];
}

interface PromptBlockRowProps {
  block: PromptBlock;
  index: number;
  onToggle: (enabled: boolean) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isDragging: boolean;
  isDropTarget: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: () => void;
  isMobile: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

function PromptBlockRow({
  block,
  index,
  onToggle,
  onMoveUp,
  onMoveDown,
  isDragging,
  isDropTarget,
  onDragStart,
  onDragEnd,
  onDragOver,
  isMobile,
  canMoveUp,
  canMoveDown,
}: PromptBlockRowProps) {
  const isLocked = block.locked === true;
  const dotColor = getBlockDotColor(block.id);
  
  return (
    <div
      draggable={!isMobile && !isLocked}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={(e) => {
        e.preventDefault();
        if (!isLocked) onDragOver();
      }}
      className={cn(
        'group relative flex items-center gap-3 px-3 py-2 transition-all duration-300',
        'border-b border-zinc-800/40 last:border-0',
        // Hover state
        !isLocked && 'hover:bg-zinc-800/40',
        // Dragging state
        isDragging && 'opacity-20 scale-[0.98] bg-zinc-800/30',
        // Drop target highlight
        isDropTarget && !isLocked && 'bg-zinc-800/40',
        // Disabled state
        !block.enabled && 'bg-zinc-950/20',
        // Locked blocks
        isLocked && 'bg-zinc-900/40 border-l-2 border-l-zinc-700/50'
      )}
    >
      {/* Checkbox for enable/disable */}
      <div className="relative flex items-center justify-center shrink-0">
        <button
          type="button"
          onClick={() => onToggle(!block.enabled)}
          className={cn(
            'w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center',
            block.enabled
              ? 'bg-blue-600 border-blue-500'
              : 'bg-transparent border-zinc-700 hover:border-zinc-500'
          )}
          aria-label={block.enabled ? 'Disable block' : 'Enable block'}
        >
          {block.enabled && (
            <div className="w-2 h-2 rounded-full bg-white" />
          )}
        </button>
      </div>

      {/* Drag handle or lock icon */}
      {!isMobile && (
        <div className={cn(
          'shrink-0 transition-all duration-200 w-5 flex items-center justify-center',
          isLocked 
            ? 'text-zinc-700' 
            : 'cursor-grab active:cursor-grabbing text-zinc-800 group-hover:text-zinc-500'
        )}>
          {isLocked ? (
            <Lock className="h-3.5 w-3.5" />
          ) : (
            <GripVertical className="h-4 w-4" />
          )}
        </div>
      )}

      {/* Color indicator dot with glow when enabled */}
      <div className="relative shrink-0 w-3 flex items-center justify-center">
        <span className={cn(
          'w-2.5 h-2.5 rounded-full transition-all',
          dotColor,
          block.enabled ? 'opacity-100' : 'opacity-20 grayscale'
        )} 
        />
      </div>

      {/* Block label */}
      <div className="flex-1 min-w-0">
        <div className={cn(
          'text-sm select-none transition-colors duration-300 font-medium truncate',
          block.enabled ? 'text-zinc-200' : 'text-zinc-500',
          isLocked && 'text-zinc-400 font-bold'
        )}>
          {block.label}
          {isLocked && <span className="text-[9px] text-zinc-600 ml-2 font-black tracking-widest uppercase">IMMUTABLE</span>}
        </div>
      </div>

      {/* Position number */}
      <div className={cn(
        'text-[10px] font-black tabular-nums w-8 text-right shrink-0 transition-all opacity-20 group-hover:opacity-60 tracking-tighter',
        isDropTarget ? 'text-zinc-300 opacity-100' : 'text-zinc-500'
      )}>
        #{index + 1}
      </div>

      {/* Mobile controls */}
      {isMobile && !isLocked && (
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={!canMoveUp}
            className="p-1.5 rounded-md hover:bg-zinc-800 disabled:opacity-10 text-zinc-400"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={!canMoveDown}
            className="p-1.5 rounded-md hover:bg-zinc-800 disabled:opacity-10 text-zinc-400"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

interface PromptLayoutEditorProps {
  layout: PromptLayout;
  onChange: (layout: PromptLayout) => void;
  isMobile?: boolean;
}

export function PromptLayoutEditor({ layout, onChange, isMobile = false }: PromptLayoutEditorProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);

  const handleDragStart = useCallback((index: number) => {
    setDragIndex(index);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
    setDropTargetIndex(null);
  }, []);

  const handleDragOver = useCallback((targetIndex: number) => {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDropTargetIndex(null);
      return;
    }
    setDropTargetIndex(targetIndex);
    onChange(reorderBlocks(layout, dragIndex, targetIndex));
    setDragIndex(targetIndex);
  }, [dragIndex, layout, onChange]);

  const handleToggle = useCallback((blockId: PromptBlockId, enabled: boolean) => {
    onChange(toggleBlock(layout, blockId, enabled));
  }, [layout, onChange]);

  const handleMoveUp = useCallback((index: number) => {
    if (index > 0) {
      onChange(reorderBlocks(layout, index, index - 1));
    }
  }, [layout, onChange]);

  const handleMoveDown = useCallback((index: number) => {
    if (index < layout.blocks.length - 1) {
      onChange(reorderBlocks(layout, index, index + 1));
    }
  }, [layout, onChange]);

  // Count enabled blocks
  const enabledCount = layout.blocks.filter(b => b.enabled).length;

  return (
    <div className="space-y-4 animate-in fade-in duration-700">
      {/* Compact legend */}
      <div className="flex items-center justify-between gap-4 px-1 text-[10px]">
        <div className="flex items-center gap-3">
          <LegendItem color={CATEGORY_COLORS.prompt} label="Prompt" />
          <LegendItem color={CATEGORY_COLORS.character} label="Character" />
          <LegendItem color={CATEGORY_COLORS.user} label="User" />
          <LegendItem color={CATEGORY_COLORS.lore} label="Lore" />
          <LegendItem color={CATEGORY_COLORS.dialogue} label="Dialogue" />
        </div>
        <span className="text-zinc-600 tabular-nums">{enabledCount}/{layout.blocks.length}</span>
      </div>

      {/* Block list */}
      <div className="rounded-2xl border border-zinc-800/60 bg-zinc-950/40 overflow-hidden shadow-2xl backdrop-blur-sm">
        {layout.blocks.map((block, index) => {
          const canMoveUp = index > 0 && !block.locked && !layout.blocks[index - 1]?.locked;
          const canMoveDown = index < layout.blocks.length - 1 && !block.locked && !layout.blocks[index + 1]?.locked;
          
          return (
            <PromptBlockRow
              key={block.id}
              block={block}
              index={index}
              onToggle={(enabled) => handleToggle(block.id, enabled)}
              onMoveUp={() => handleMoveUp(index)}
              onMoveDown={() => handleMoveDown(index)}
              isDragging={dragIndex === index}
              isDropTarget={dropTargetIndex === index}
              onDragStart={() => handleDragStart(index)}
              onDragEnd={handleDragEnd}
              onDragOver={() => handleDragOver(index)}
              isMobile={isMobile}
              canMoveUp={canMoveUp}
              canMoveDown={canMoveDown}
            />
          );
        })}
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className={cn('w-2 h-2 rounded-sm', color)} />
      <span className="text-zinc-500">{label}</span>
    </div>
  );
}
