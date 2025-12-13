/**
 * PromptOverridesSection - System prompt and post-history instructions.
 */

import { useState } from 'react';
import { Maximize2, Minimize2, Info } from 'lucide-react';
import { MacroHighlightTextarea } from '../MacroHighlightTextarea';

interface PromptOverridesSectionProps {
  systemPrompt: string;
  postHistoryInstructions: string;
  onChange: (field: 'system_prompt' | 'post_history_instructions', value: string) => void;
}

export function PromptOverridesSection({
  systemPrompt,
  postHistoryInstructions,
  onChange,
}: PromptOverridesSectionProps) {
  const [expandedSystem, setExpandedSystem] = useState(false);
  const [expandedPost, setExpandedPost] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="space-y-5">
      {/* Info callout */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="flex w-full items-center gap-2 text-left"
        >
          <Info className="h-4 w-4 shrink-0 text-blue-400" />
          <span className="text-sm text-zinc-300">What are prompt overrides?</span>
        </button>
        {showHelp && (
          <div className="mt-3 space-y-2 text-xs text-zinc-400">
            <p>
              These fields let your character override the user's default prompts in frontends 
              like SillyTavern that support it.
            </p>
            <p>
              <strong className="text-zinc-300">System Prompt:</strong> Replaces the main system prompt. 
              Use <code className="rounded bg-zinc-800 px-1">{`{{original}}`}</code> to include the 
              user's default prompt and add to it.
            </p>
            <p>
              <strong className="text-zinc-300">Post-History Instructions:</strong> Injected after 
              the chat history. Good for reminders about format, behavior, or recent context.
            </p>
          </div>
        )}
      </div>
      
      {/* System Prompt */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-sm font-medium text-zinc-300">System Prompt Override</label>
          <button
            onClick={() => setExpandedSystem(!expandedSystem)}
            className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
          >
            {expandedSystem ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
        <MacroHighlightTextarea
          value={systemPrompt}
          onChange={(v) => onChange('system_prompt', v)}
          placeholder="{{original}}

Additional instructions for this character..."
          rows={expandedSystem ? 12 : 4}
          maxRows={expandedSystem ? 25 : 8}
        />
        <p className="mt-1 text-xs text-zinc-500">
          Use <code className="rounded bg-zinc-800 px-1">{`{{original}}`}</code> to include the user's 
          default system prompt.
        </p>
      </div>
      
      {/* Post-History Instructions */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-sm font-medium text-zinc-300">Post-History Instructions</label>
          <button
            onClick={() => setExpandedPost(!expandedPost)}
            className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
          >
            {expandedPost ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
        <MacroHighlightTextarea
          value={postHistoryInstructions}
          onChange={(v) => onChange('post_history_instructions', v)}
          placeholder="Remember to stay in character. Focus on..."
          rows={expandedPost ? 12 : 4}
          maxRows={expandedPost ? 25 : 8}
        />
        <p className="mt-1 text-xs text-zinc-500">
          Injected after the chat history, just before generation. Good for format reminders.
        </p>
      </div>
    </div>
  );
}

