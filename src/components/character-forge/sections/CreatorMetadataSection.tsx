/**
 * CreatorMetadataSection - Creator info, version, notes, and tags.
 */

import { useState, useRef } from 'react';
import { X, Plus } from 'lucide-react';
import { MacroHighlightTextarea } from '../MacroHighlightTextarea';

interface CreatorMetadataSectionProps {
  creator: string;
  characterVersion: string;
  creatorNotes: string;
  tags: string[];
  onChange: (field: 'creator' | 'character_version' | 'creator_notes' | 'tags', value: string | string[]) => void;
}

export function CreatorMetadataSection({
  creator,
  characterVersion,
  creatorNotes,
  tags,
  onChange,
}: CreatorMetadataSectionProps) {
  const [tagInput, setTagInput] = useState('');
  const tagInputRef = useRef<HTMLInputElement>(null);
  
  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag)) {
      onChange('tags', [...tags, tag]);
    }
    setTagInput('');
    tagInputRef.current?.focus();
  };
  
  const handleRemoveTag = (tag: string) => {
    onChange('tags', tags.filter((t) => t !== tag));
  };
  
  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      // Remove last tag on backspace if input is empty
      handleRemoveTag(tags[tags.length - 1]);
    }
  };

  return (
    <div className="space-y-5">
      {/* Creator & Version row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-300">Creator</label>
          <input
            type="text"
            value={creator}
            onChange={(e) => onChange('creator', e.target.value)}
            placeholder="Your name or handle"
            className="h-9 w-full rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30"
          />
        </div>
        
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-300">Version</label>
          <input
            type="text"
            value={characterVersion}
            onChange={(e) => onChange('character_version', e.target.value)}
            placeholder="1.0"
            className="h-9 w-full rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30"
          />
        </div>
      </div>
      
      {/* Tags */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-zinc-300">Tags</label>
        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 p-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 rounded-full bg-violet-500/20 px-2.5 py-1 text-xs font-medium text-violet-300"
            >
              {tag}
              <button
                onClick={() => handleRemoveTag(tag)}
                className="rounded-full p-0.5 hover:bg-violet-500/30"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <input
            ref={tagInputRef}
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            onBlur={() => tagInput && handleAddTag()}
            placeholder={tags.length === 0 ? 'Add tags...' : ''}
            className="min-w-[100px] flex-1 bg-transparent px-1 py-1 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none"
          />
          {tagInput && (
            <button
              onClick={handleAddTag}
              className="rounded-full bg-zinc-800 p-1 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <p className="mt-1 text-xs text-zinc-500">Press Enter to add a tag</p>
      </div>
      
      {/* Creator Notes */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-zinc-300">Creator Notes</label>
        <p className="mb-2 text-xs text-zinc-500">
          Instructions for users of this card. NOT sent to the AI—visible in the character info panel only.
        </p>
        <MacroHighlightTextarea
          value={creatorNotes}
          onChange={(v) => onChange('creator_notes', v)}
          placeholder="Usage tips, recommended settings, changelog..."
          rows={5}
          maxRows={12}
        />
      </div>
    </div>
  );
}

