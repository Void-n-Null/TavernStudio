import type { PromptEngineeringPreset } from '../../types/promptEngineering';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { MacroHighlightTextarea } from '../character-forge/MacroHighlightTextarea';
import { BoolFieldRow, PromptSectionTitle, createEmptyInstruct } from './promptEngineeringEditorShared';

/** Common instruct format presets with documentation */
const FORMAT_PRESETS = {
  chatml: {
    name: 'ChatML',
    desc: 'OpenAI legacy, Qwen, Yi, many finetunes',
    system_sequence: '<|im_start|>system\n',
    system_suffix: '<|im_end|>\n',
    input_sequence: '<|im_start|>user\n',
    input_suffix: '<|im_end|>\n',
    output_sequence: '<|im_start|>assistant\n',
    output_suffix: '<|im_end|>\n',
    stop_sequence: '<|im_end|>',
  },
  harmony: {
    name: 'Harmony',
    desc: 'OpenAI gpt-oss models (2025+)',
    system_sequence: '<|start|>system<|message|>',
    system_suffix: '<|end|>',
    input_sequence: '<|start|>user<|message|>',
    input_suffix: '<|end|>',
    output_sequence: '<|start|>assistant<|message|>',
    output_suffix: '<|end|>',
    stop_sequence: '<|end|>',
  },
  llama3: {
    name: 'Llama 3',
    desc: 'Meta Llama 3, 3.1, 3.2, 3.3',
    system_sequence: '<|start_header_id|>system<|end_header_id|>\n\n',
    system_suffix: '<|eot_id|>',
    input_sequence: '<|start_header_id|>user<|end_header_id|>\n\n',
    input_suffix: '<|eot_id|>',
    output_sequence: '<|start_header_id|>assistant<|end_header_id|>\n\n',
    output_suffix: '<|eot_id|>',
    stop_sequence: '<|eot_id|>',
  },
  gemma: {
    name: 'Gemma 2',
    desc: 'Google Gemma (no system role)',
    system_sequence: '',
    system_suffix: '',
    input_sequence: '<start_of_turn>user\n',
    input_suffix: '<end_of_turn>\n',
    output_sequence: '<start_of_turn>model\n',
    output_suffix: '<end_of_turn>\n',
    stop_sequence: '<end_of_turn>',
  },
  mistral: {
    name: 'Mistral',
    desc: 'Mistral 7B, Mixtral',
    system_sequence: '',
    system_suffix: '\n\n',
    input_sequence: '[INST] ',
    input_suffix: ' [/INST]',
    output_sequence: '',
    output_suffix: '</s> ',
    stop_sequence: '</s>',
  },
  llama2: {
    name: 'Llama 2',
    desc: 'Legacy Llama 2 Chat',
    system_sequence: '[INST] <<SYS>>\n',
    system_suffix: '\n<</SYS>>\n\n',
    input_sequence: '',
    input_suffix: ' [/INST] ',
    output_sequence: '',
    output_suffix: ' </s><s>[INST] ',
    stop_sequence: '</s>',
  },
  alpaca: {
    name: 'Alpaca',
    desc: 'Stanford Alpaca style',
    system_sequence: '',
    system_suffix: '\n\n',
    input_sequence: '### Instruction:\n',
    input_suffix: '\n\n',
    output_sequence: '### Response:\n',
    output_suffix: '\n\n',
    stop_sequence: '### Instruction:',
  },
  commandr: {
    name: 'Command-R',
    desc: 'Cohere Command-R/R+',
    system_sequence: '<|START_OF_TURN_TOKEN|><|SYSTEM_TOKEN|>',
    system_suffix: '<|END_OF_TURN_TOKEN|>',
    input_sequence: '<|START_OF_TURN_TOKEN|><|USER_TOKEN|>',
    input_suffix: '<|END_OF_TURN_TOKEN|>',
    output_sequence: '<|START_OF_TURN_TOKEN|><|CHATBOT_TOKEN|>',
    output_suffix: '<|END_OF_TURN_TOKEN|>',
    stop_sequence: '<|END_OF_TURN_TOKEN|>',
  },
} as const;

/** Check if a string has meaningful content */
function hasContent(value: string | undefined): boolean {
  return !!value?.trim();
}

export function PromptEngineeringInstructTab({
  preset,
  onChange,
}: {
  preset: PromptEngineeringPreset;
  onChange: (next: PromptEngineeringPreset) => void;
}) {
  // Auto-initialize instruct if it doesn't exist
  const instruct = preset.instruct ?? createEmptyInstruct(preset.name);
  
  const updateField = <K extends keyof typeof instruct>(key: K, value: (typeof instruct)[K]) => {
    onChange({ ...preset, instruct: { ...instruct, [key]: value } });
  };
  
  // Apply a format preset
  const applyPreset = (presetKey: keyof typeof FORMAT_PRESETS) => {
    const format = FORMAT_PRESETS[presetKey];
    onChange({
      ...preset,
      instruct: {
        ...instruct,
        system_sequence: format.system_sequence,
        system_suffix: format.system_suffix,
        input_sequence: format.input_sequence,
        input_suffix: format.input_suffix,
        output_sequence: format.output_sequence,
        output_suffix: format.output_suffix,
        stop_sequence: format.stop_sequence,
      },
    });
  };

  const hasAnySequences = hasContent(instruct.system_sequence) || 
    hasContent(instruct.input_sequence) || 
    hasContent(instruct.output_sequence);

  return (
    <div className="space-y-6">
      {/* Overview */}
      <div className="space-y-2">
        <PromptSectionTitle
          title="Message Wrapping (Instruct Format)"
          hasContent={hasAnySequences}
        />
      </div>

      {/* Quick Presets */}
      <div className="space-y-2">
        <div className="text-xs font-medium text-zinc-400">Quick Presets</div>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(FORMAT_PRESETS).map(([key, format]) => (
            <button
              key={key}
              type="button"
              onClick={() => applyPreset(key as keyof typeof FORMAT_PRESETS)}
              className="group rounded border border-zinc-700/60 bg-zinc-800/40 px-2 py-1 text-xs hover:bg-zinc-700 transition-colors"
              title={format.desc}
            >
              <span className="text-zinc-300">{format.name}</span>
            </button>
          ))}
        </div>
        <p className="text-[10px] text-zinc-600">
          Hover for model info. Click to apply. Verify against your model's docs.
        </p>
      </div>

      {/* Message Prefixes */}
      <div className="space-y-3">
        <PromptSectionTitle
          title="Message Prefixes"
          subtitle="Inserted BEFORE each message type"
          hasContent={hasContent(instruct.system_sequence) || hasContent(instruct.input_sequence) || hasContent(instruct.output_sequence)}
        />
        
        <div className="grid gap-3 md:grid-cols-3">
          <MacroHighlightTextarea
            value={instruct.system_sequence}
            onChange={(v) => updateField('system_sequence', v)}
            label="System prefix"
            placeholder={`<|im_start|>system\n`}
            rows={2}
            maxRows={4}
          />
          <MacroHighlightTextarea
            value={instruct.input_sequence}
            onChange={(v) => updateField('input_sequence', v)}
            label="User prefix"
            placeholder={`<|im_start|>user\n`}
            rows={2}
            maxRows={4}
          />
          <MacroHighlightTextarea
            value={instruct.output_sequence}
            onChange={(v) => updateField('output_sequence', v)}
            label="Assistant prefix"
            placeholder={`<|im_start|>assistant\n`}
            rows={2}
            maxRows={4}
          />
        </div>
      </div>

      {/* Message Suffixes */}
      <div className="space-y-3">
        <PromptSectionTitle
          title="Message Suffixes"
          subtitle="Inserted AFTER each message type"
          hasContent={hasContent(instruct.system_suffix) || hasContent(instruct.input_suffix) || hasContent(instruct.output_suffix)}
        />
        
        <div className="grid gap-3 md:grid-cols-3">
          <MacroHighlightTextarea
            value={instruct.system_suffix}
            onChange={(v) => updateField('system_suffix', v)}
            label="System suffix"
            placeholder={`<|im_end|>\n`}
            rows={2}
            maxRows={4}
          />
          <MacroHighlightTextarea
            value={instruct.input_suffix}
            onChange={(v) => updateField('input_suffix', v)}
            label="User suffix"
            placeholder={`<|im_end|>\n`}
            rows={2}
            maxRows={4}
          />
          <MacroHighlightTextarea
            value={instruct.output_suffix}
            onChange={(v) => updateField('output_suffix', v)}
            label="Assistant suffix"
            placeholder={`<|im_end|>\n`}
            rows={2}
            maxRows={4}
          />
        </div>
      </div>

      {/* Stop Sequence */}
      <div className="space-y-2">
        <PromptSectionTitle
          title="Stop Sequence"
          hasContent={hasContent(instruct.stop_sequence)}
        />
        <MacroHighlightTextarea
          value={instruct.stop_sequence}
          onChange={(v) => updateField('stop_sequence', v)}
          placeholder={`<|im_end|>`}
          rows={1}
          maxRows={2}
        />
      </div>

      {/* Advanced Options */}
      <details className="rounded-lg border border-zinc-800/50 bg-zinc-900/20">
        <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-zinc-400 hover:text-zinc-300">
          Advanced Options
        </summary>
        <div className="space-y-3 px-4 pb-4">
          <BoolFieldRow
            label="Wrap sequences with newlines"
            checked={instruct.wrap}
            onCheckedChange={(wrap) => updateField('wrap', wrap)}
            description="Add newlines around each sequence (required for Alpaca format)"
          />
          <BoolFieldRow
            label="Use sequences as stop strings"
            checked={instruct.sequences_as_stop_strings}
            onCheckedChange={(v) => updateField('sequences_as_stop_strings', v)}
            description="Also use prefix sequences as additional stop strings"
          />
          <BoolFieldRow
            label="System uses user format"
            checked={instruct.system_same_as_user}
            onCheckedChange={(v) => updateField('system_same_as_user', v)}
            description="Use user prefix/suffix for system messages instead of system-specific ones"
          />
          <div className="rounded-lg border border-zinc-800/50 bg-zinc-900/30 p-3 space-y-2">
            <Label className="text-zinc-400">Model activation regex</Label>
            <Input
              value={instruct.activation_regex}
              onChange={(e) => updateField('activation_regex', e.target.value)}
              placeholder="e.g., mistral|llama"
              className="font-mono text-xs"
            />
            <p className="text-xs text-zinc-600">Auto-select this template when connected model name matches</p>
          </div>
        </div>
      </details>
    </div>
  );
}
