import { useState, useCallback } from 'react';
import { GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
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
  totalBlocks: number;
  onToggle: (enabled: boolean) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isDragging: boolean;
  isDropTarget: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: () => void;
  isMobile: boolean;
}

function PromptBlockRow({
  block,
  index,
  totalBlocks,
  onToggle,
  onMoveUp,
  onMoveDown,
  isDragging,
  isDropTarget,
  onDragStart,
  onDragEnd,
  onDragOver,
  isMobile,
}: PromptBlockRowProps) {
  return (
    <div
      draggable={!isMobile}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver();
      }}
      className={cn(
        'group relative flex items-center gap-2 rounded-md transition-all duration-150',
        'hover:bg-zinc-800/40',
        isDragging && 'opacity-40 scale-[0.98]',
        isDropTarget && 'ring-1 ring-violet-500/50 bg-violet-500/5',
        !block.enabled && 'opacity-50'
      )}
    >
      {/* Checkbox for enable/disable - clean toggle */}
      <button
        type="button"
        onClick={() => onToggle(!block.enabled)}
        className={cn(
          'w-4 h-4 rounded border-2 transition-all shrink-0 ml-1',
          block.enabled
            ? 'bg-violet-600 border-violet-600'
            : 'bg-transparent border-zinc-600 hover:border-zinc-500'
        )}
        title={block.enabled ? 'Enabled (click to disable)' : 'Disabled (click to enable)'}
        aria-label={block.enabled ? 'Disable block' : 'Enable block'}
      >
        {block.enabled && (
          <svg className="w-full h-full text-white" viewBox="0 0 16 16" fill="none">
            <path d="M4 8l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Drag handle - appears on hover for desktop */}
      {!isMobile && (
        <div className={cn(
          'cursor-grab active:cursor-grabbing text-zinc-600 shrink-0 transition-opacity',
          'opacity-0 group-hover:opacity-100'
        )}>
          <GripVertical className="h-4 w-4" />
        </div>
      )}

      {/* Color indicator dot */}
      <span className={cn(
        'w-2 h-2 rounded-full shrink-0',
        getBlockDotColor(block.id),
        !block.enabled && 'opacity-40'
      )} />

      {/* Block label - the main content */}
      <span className={cn(
        'flex-1 text-sm py-1.5 select-none',
        block.enabled ? 'text-zinc-200' : 'text-zinc-500'
      )}>
        {block.label}
      </span>

      {/* Position number - subtle indicator */}
      <span className="text-[10px] text-zinc-600 tabular-nums w-4 text-right shrink-0">
        {index + 1}
      </span>

      {/* Mobile-only: arrow buttons for reordering */}
      {isMobile && (
        <div className="flex flex-col shrink-0">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            className="p-1 text-zinc-500 disabled:opacity-30 disabled:cursor-not-allowed active:text-zinc-300"
            aria-label="Move up"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index === totalBlocks - 1}
            className="p-1 text-zinc-500 disabled:opacity-30 disabled:cursor-not-allowed active:text-zinc-300"
            aria-label="Move down"
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
      <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/30 divide-y divide-zinc-800/40">
        {layout.blocks.map((block, index) => (
          <PromptBlockRow
            key={block.id}
            block={block}
            index={index}
            totalBlocks={layout.blocks.length}
            onToggle={(enabled) => handleToggle(block.id, enabled)}
            onMoveUp={() => handleMoveUp(index)}
            onMoveDown={() => handleMoveDown(index)}
            isDragging={dragIndex === index}
            isDropTarget={dropTargetIndex === index}
            onDragStart={() => handleDragStart(index)}
            onDragEnd={handleDragEnd}
            onDragOver={() => handleDragOver(index)}
            isMobile={isMobile}
          />
        ))}
      </div>

      {/* Minimal footer hint */}
      <p className="text-[10px] text-zinc-600 text-center">
        {isMobile ? 'Use arrows to reorder' : 'Drag to reorder'} · Empty blocks auto-skip
      </p>
    </div>
  );
}
