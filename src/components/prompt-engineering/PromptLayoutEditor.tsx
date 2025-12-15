import { useState, useCallback } from 'react';
import { GripVertical, ChevronUp, ChevronDown, Lock } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { PromptLayout, PromptBlock, PromptBlockId } from '../../lib/promptLayout';
import { reorderBlocks, toggleBlock } from '../../lib/promptLayout';

/**
 * Color dot for block category - Notion-inspired minimal indicator
 */
function getBlockDotColor(id: PromptBlockId): string {
  switch (id) {
    case 'system_prompt':
    case 'post_history':
    case 'prefill':
      return 'bg-violet-500';
    case 'char_description':
    case 'char_personality':
    case 'scenario':
      return 'bg-emerald-500';
    case 'persona':
      return 'bg-sky-500';
    case 'world_info_before':
    case 'world_info_after':
      return 'bg-amber-500';
    case 'example_dialogue':
    case 'chat_history':
      return 'bg-zinc-400';
    default:
      return 'bg-zinc-600';
  }
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
        'group relative flex items-center gap-2 px-2 py-1.5 transition-all duration-200',
        // Hover state with subtle lift effect
        !isLocked && 'hover:bg-zinc-800/50 hover:translate-x-0.5',
        // Dragging state
        isDragging && 'opacity-40 scale-[0.98] bg-violet-500/10',
        // Drop target highlight
        isDropTarget && !isLocked && 'ring-2 ring-violet-500/60 bg-violet-500/10 rounded-md',
        // Disabled state
        !block.enabled && 'opacity-40',
        // Locked blocks have different styling
        isLocked && 'bg-zinc-800/20 border-t border-zinc-700/50'
      )}
    >
      {/* Checkbox for enable/disable - with pulse animation on change */}
      <button
        type="button"
        onClick={() => onToggle(!block.enabled)}
        className={cn(
          'w-4 h-4 rounded border-2 transition-all duration-200 shrink-0',
          'hover:scale-110 active:scale-95',
          block.enabled
            ? 'bg-violet-600 border-violet-600 shadow-sm shadow-violet-500/30'
            : 'bg-transparent border-zinc-600 hover:border-zinc-400'
        )}
        title={block.enabled ? 'Enabled (click to disable)' : 'Disabled (click to enable)'}
        aria-label={block.enabled ? 'Disable block' : 'Enable block'}
      >
        {block.enabled && (
          <svg className="w-full h-full text-white" viewBox="0 0 16 16" fill="none">
            <path d="M4 8l3 3 5-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Drag handle or lock icon */}
      {!isMobile && (
        <div className={cn(
          'shrink-0 transition-all duration-200 w-4',
          isLocked 
            ? 'text-zinc-600' 
            : 'cursor-grab active:cursor-grabbing text-zinc-700 opacity-0 group-hover:opacity-100 group-hover:text-zinc-400'
        )}>
          {isLocked ? (
            <Lock className="h-3 w-3" />
          ) : (
            <GripVertical className="h-4 w-4" />
          )}
        </div>
      )}

      {/* Color indicator dot with glow when enabled */}
      <span className={cn(
        'w-2 h-2 rounded-full shrink-0 transition-all duration-300',
        getBlockDotColor(block.id),
        block.enabled && 'shadow-sm',
        block.enabled && block.id.includes('system') && 'shadow-violet-500/50',
        block.enabled && block.id.includes('char') && 'shadow-emerald-500/50',
        block.enabled && block.id.includes('persona') && 'shadow-sky-500/50',
        block.enabled && block.id.includes('world') && 'shadow-amber-500/50',
        !block.enabled && 'opacity-30'
      )} />

      {/* Block label */}
      <span className={cn(
        'flex-1 text-sm select-none transition-colors duration-200',
        block.enabled ? 'text-zinc-200' : 'text-zinc-500',
        isLocked && 'text-zinc-400 italic'
      )}>
        {block.label}
        {isLocked && <span className="text-[10px] text-zinc-600 ml-1.5">(fixed)</span>}
      </span>

      {/* Position number */}
      <span className={cn(
        'text-[10px] tabular-nums w-5 text-right shrink-0 transition-colors',
        isDropTarget ? 'text-violet-400' : 'text-zinc-600'
      )}>
        {index + 1}
      </span>

      {/* Mobile: arrow buttons (hidden for locked blocks) */}
      {isMobile && !isLocked && (
        <div className="flex flex-col shrink-0 -my-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={!canMoveUp}
            className={cn(
              'p-1 transition-all duration-150',
              'disabled:opacity-20 disabled:cursor-not-allowed',
              'text-zinc-500 hover:text-zinc-300 active:scale-90'
            )}
            aria-label="Move up"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={!canMoveDown}
            className={cn(
              'p-1 transition-all duration-150',
              'disabled:opacity-20 disabled:cursor-not-allowed',
              'text-zinc-500 hover:text-zinc-300 active:scale-90'
            )}
            aria-label="Move down"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      )}
      
      {/* Mobile: show lock for locked blocks */}
      {isMobile && isLocked && (
        <Lock className="h-3 w-3 text-zinc-600 shrink-0" />
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
    <div className="space-y-3">
      {/* Compact legend */}
      <div className="flex items-center gap-3 text-[10px] text-zinc-500">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-violet-500" /> Prompts
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" /> Character
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-sky-500" /> User
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-500" /> Lore
        </span>
        <span className="ml-auto text-zinc-600">
          {enabledCount}/{layout.blocks.length} active
        </span>
      </div>

      {/* Block list */}
      <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/40 overflow-hidden">
        {layout.blocks.map((block, index) => {
          // Calculate if this block can move up/down (respecting locked blocks)
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

      {/* Minimal footer hint */}
      <p className="text-[10px] text-zinc-600 text-center">
        {isMobile ? 'Use arrows to reorder' : 'Drag to reorder'} · Empty blocks auto-skip
      </p>
    </div>
  );
}
