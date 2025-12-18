import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { PromptEngineeringPreset } from '../../types/promptEngineering';
import { MacroHighlightTextarea } from '../character-forge/MacroHighlightTextarea';
import { BoolFieldRow, PromptSectionTitle, createEmptyOutput } from './promptEngineeringEditorShared';
import { Input } from '../ui/input';
import { Button } from '../ui/button';

/** Common reasoning format presets */
const REASONING_PRESETS = {
  think: { name: '<think>', desc: 'DeepSeek, Qwen-QwQ', prefix: '<think>', suffix: '</think>' },
  reasoning: { name: '<reasoning>', desc: 'Generic XML style', prefix: '<reasoning>', suffix: '</reasoning>' },
  scratchpad: { name: '<scratchpad>', desc: 'Anthropic scratchpad', prefix: '<scratchpad>', suffix: '</scratchpad>' },
  cot: { name: '[COT]', desc: 'Bracket style', prefix: '[COT]', suffix: '[/COT]' },
} as const;

/** Common stop string presets */
const STOP_STRING_PRESETS = [
  { label: '{{user}}:', value: '\n{{user}}:' },
  { label: '{{char}}:', value: '\n{{char}}:' },
] as const;

/** Check if a string has meaningful content */
function hasContent(value: string | undefined): boolean {
  return !!value?.trim();
}

export function PromptEngineeringOutputTab({
  preset,
  onChange,
}: {
  preset: PromptEngineeringPreset;
  onChange: (next: PromptEngineeringPreset) => void;
}) {
  const [newStopString, setNewStopString] = useState('');
  
  // Auto-initialize output if it doesn't exist
  const output = preset.output ?? createEmptyOutput(preset.name);
  
  const updateField = <K extends keyof typeof output>(key: K, value: (typeof output)[K]) => {
    onChange({ ...preset, output: { ...output, [key]: value } });
  };

  const addStopString = (value: string) => {
    // Stop strings may intentionally be whitespace-only (e.g. "\n"), so don't trim.
    if (value.length === 0) return;
    const current = output.custom_stop_strings;
    if (!current.includes(value)) {
      updateField('custom_stop_strings', [...current, value]);
    }
    setNewStopString('');
  };

  const removeStopString = (index: number) => {
    const next = output.custom_stop_strings.filter((_, i) => i !== index);
    updateField('custom_stop_strings', next);
  };

  const hasReasoningContent = hasContent(output.reasoning_prefix) || hasContent(output.reasoning_suffix);
  const hasStopStrings = output.custom_stop_strings.length > 0;

  return (
    <div className="space-y-6">
      {/* Stop Strings Section */}
      <div className="space-y-3">
        <PromptSectionTitle
          title="Stop Strings"
          hasContent={hasStopStrings}
        />

        {/* Quick add presets */}
        <div className="flex flex-wrap gap-1.5">
          {STOP_STRING_PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => addStopString(p.value)}
              disabled={output.custom_stop_strings.includes(p.value)}
              className="rounded border border-zinc-700/60 bg-zinc-800/40 px-2 py-1 text-xs hover:bg-zinc-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title={`Add "${p.value.replace('\n', '\\n')}"`}
            >
              <span className="text-zinc-300">{p.label}</span>
            </button>
          ))}
        </div>

        {/* Current stop strings */}
        {output.custom_stop_strings.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {output.custom_stop_strings.map((s, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded bg-zinc-800 px-2 py-1 text-xs font-mono text-zinc-300"
              >
                {s.replace(/\n/g, '\\n')}
                <button
                  type="button"
                  onClick={() => removeStopString(i)}
                  className="text-zinc-500 hover:text-zinc-300"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Add custom */}
        <div className="flex gap-2">
          <Input
            value={newStopString}
            onChange={(e) => setNewStopString(e.target.value)}
            placeholder="Custom stop string..."
            className="flex-1 h-8 text-xs font-mono"
            onKeyDown={(e) => e.key === 'Enter' && addStopString(newStopString)}
          />
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => addStopString(newStopString)}
            disabled={newStopString.length === 0}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Reasoning Detection Section */}
      <div className="space-y-3">
        <PromptSectionTitle
          title="Reasoning Detection"
          hasContent={hasReasoningContent}
        />

        {/* Reasoning presets */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-zinc-400">Format Presets</div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(REASONING_PRESETS).map(([key, p]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  updateField('reasoning_prefix', p.prefix);
                  updateField('reasoning_suffix', p.suffix);
                }}
                className="rounded border border-zinc-700/60 bg-zinc-800/40 px-2 py-1 text-xs hover:bg-zinc-700 transition-colors"
                title={p.desc}
              >
                <span className="text-zinc-300 font-mono">{p.name}</span>
              </button>
            ))}
          </div>
        </div>
        
        <div className="grid gap-3 md:grid-cols-2">
          <MacroHighlightTextarea
            value={output.reasoning_prefix}
            onChange={(v) => updateField('reasoning_prefix', v)}
            label="Reasoning prefix"
            placeholder="<think>"
            rows={2}
            maxRows={3}
          />
          <MacroHighlightTextarea
            value={output.reasoning_suffix}
            onChange={(v) => updateField('reasoning_suffix', v)}
            label="Reasoning suffix"
            placeholder="</think>"
            rows={2}
            maxRows={3}
          />
        </div>

        <BoolFieldRow
          label="Auto-parse reasoning"
          checked={output.auto_parse_reasoning}
          onCheckedChange={(v) => updateField('auto_parse_reasoning', v)}
          description="Automatically extract reasoning blocks from responses"
        />
      </div>

      {/* Response Processing Section */}
      <div className="space-y-3">
        <PromptSectionTitle
          title="Response Processing"
          hasContent={output.trim_incomplete_sentences || output.single_line_mode}
        />

        <BoolFieldRow
          label="Trim incomplete sentences"
          checked={output.trim_incomplete_sentences}
          onCheckedChange={(v) => updateField('trim_incomplete_sentences', v)}
          description="Remove trailing text that doesn't end with punctuation"
        />
        <BoolFieldRow
          label="Single line mode"
          checked={output.single_line_mode}
          onCheckedChange={(v) => updateField('single_line_mode', v)}
          description="Collapse multi-line responses to a single line"
        />
      </div>
    </div>
  );
}

/** @deprecated Use PromptEngineeringOutputTab instead */
export const PromptEngineeringReasoningTab = PromptEngineeringOutputTab;
