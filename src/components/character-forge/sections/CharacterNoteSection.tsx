/**
 * CharacterNoteSection - Character note with depth and role controls.
 * 
 * This is injected at a specific depth in the chat history to reinforce character traits.
 */

import { Info } from 'lucide-react';
import { MacroHighlightTextarea } from '../MacroHighlightTextarea';

interface CharacterNoteSectionProps {
  characterNote: string;
  noteDepth: number;
  noteRole: 'system' | 'user' | 'assistant';
  onChange: (field: 'character_note' | 'note_depth' | 'note_role', value: string | number) => void;
}

const ROLE_OPTIONS: Array<{ value: 'system' | 'user' | 'assistant'; label: string; description: string }> = [
  { value: 'system', label: 'System', description: 'Appears as a system message' },
  { value: 'user', label: 'User', description: 'Appears as if from the user' },
  { value: 'assistant', label: 'Assistant', description: 'Appears as if from the character' },
];

export function CharacterNoteSection({
  characterNote,
  noteDepth,
  noteRole,
  onChange,
}: CharacterNoteSectionProps) {
  return (
    <div className="space-y-5">
      {/* Info callout */}
      <div className="flex items-start gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
        <div className="text-xs text-zinc-400">
          <p>
            The Character Note is injected at a specific position in the chat history. 
            Use it to reinforce character traits as the conversation progresses.
          </p>
          <p className="mt-1">
            <strong className="text-zinc-300">Depth:</strong> How many messages back from the 
            current turn to insert. 0 = right before generation, higher = earlier in context.
          </p>
        </div>
      </div>
      
      {/* Note content */}
      <MacroHighlightTextarea
        label="Character Note"
        description="Text that will be injected into the chat at the specified depth."
        value={characterNote}
        onChange={(v) => onChange('character_note', v)}
        placeholder="[{{char}}'s core traits: witty, sarcastic, secretly caring]"
        rows={4}
        maxRows={10}
      />
      
      {/* Depth and Role controls */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-300">Injection Depth</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={100}
              value={noteDepth}
              onChange={(e) => onChange('note_depth', parseInt(e.target.value) || 0)}
              className="h-9 w-20 rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 text-sm text-zinc-200 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30"
            />
            <span className="text-xs text-zinc-500">messages from current</span>
          </div>
          <p className="mt-1 text-xs text-zinc-600">
            0 = immediately before AI response
          </p>
        </div>
        
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-300">Message Role</label>
          <select
            value={noteRole}
            onChange={(e) => onChange('note_role', e.target.value)}
            className="h-9 w-full rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 text-sm text-zinc-200 focus:border-violet-500/50 focus:outline-none"
          >
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-zinc-600">
            {ROLE_OPTIONS.find((o) => o.value === noteRole)?.description}
          </p>
        </div>
      </div>
    </div>
  );
}

