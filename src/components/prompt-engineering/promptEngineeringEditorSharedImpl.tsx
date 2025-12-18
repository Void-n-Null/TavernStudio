import { useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import { ChevronDown, ChevronRight, Info } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import type {
  StContextTemplate,
  StInstructTemplate,
  StOutputTemplate,
  StReasoningTemplate,
  StSystemPromptTemplate,
} from '../../lib/sillyTavernAdvancedFormatting';

/** Shared expandable education/help panel */
export function EducationPanel({ title, children }: { title: string; children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className={cn(
      'rounded-lg border transition-colors',
      isOpen ? 'border-zinc-700/50 bg-zinc-900/30' : 'border-zinc-800/40 bg-zinc-900/20'
    )}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-zinc-400 hover:text-zinc-300"
      >
        {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <Info className="h-3 w-3" />
        <span>{title}</span>
      </button>
      {isOpen && (
        <div className="px-3 pb-3 text-xs text-zinc-500 leading-relaxed space-y-2">
          {children}
        </div>
      )}
    </div>
  );
}

export function BoolFieldRow({
  label,
  checked,
  onCheckedChange,
  description,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  description?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-zinc-800/50 bg-zinc-900/30 p-3">
      <div className="min-w-0">
        <div className="text-sm font-medium text-zinc-200">{label}</div>
        {description ? <div className="mt-1 text-xs text-zinc-500">{description}</div> : null}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export function numberInput(
  v: number,
  onChange: (next: number) => void
): { value: string; onChange: (e: ChangeEvent<HTMLInputElement>) => void } {
  return {
    value: Number.isFinite(v) ? String(v) : '0',
    onChange: (e) => {
      const n = Number(e.target.value);
      onChange(Number.isFinite(n) ? n : 0);
    },
  };
}

export function NumberField({
  label,
  value,
  onValue,
}: {
  label: string;
  value: number;
  onValue: (next: number) => void;
}) {
  return (
    <div className="rounded-lg border border-zinc-800/50 bg-zinc-900/30 p-3 space-y-2">
      <Label>{label}</Label>
      <Input type="number" {...numberInput(value, onValue)} />
    </div>
  );
}

export function SectionWrapper({
  title,
  enabled,
  onEnable,
  children,
}: {
  title: string;
  enabled: boolean;
  onEnable: (enabled: boolean) => void;
  children: ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-zinc-100">{title}</div>
          <div className="text-xs text-zinc-500 mt-0.5">Toggle on to include this section in the preset.</div>
        </div>
        <Switch checked={enabled} onCheckedChange={onEnable} />
      </div>

      {enabled ? (
        children
      ) : (
        <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/30 p-4 text-sm text-zinc-500">Disabled</div>
      )}
    </div>
  );
}

/** Section title that shows filled/empty state via text color - no toggle needed */
export function PromptSectionTitle({
  title,
  subtitle,
  hasContent,
}: {
  title: string;
  subtitle?: string;
  hasContent: boolean;
}) {
  return (
    <div className="min-w-0">
      <div className={`text-sm font-semibold ${hasContent ? 'text-zinc-100' : 'text-zinc-500'}`}>
        {title}
        {hasContent && <span className="ml-2 text-xs text-zinc-500">●</span>}
      </div>
      {subtitle && <div className="text-xs text-zinc-600 mt-0.5">{subtitle}</div>}
    </div>
  );
}

export function createEmptyInstruct(name: string): StInstructTemplate {
  return {
    name,
    input_sequence: '',
    input_suffix: '',
    output_sequence: '',
    output_suffix: '',
    first_output_sequence: '',
    last_output_sequence: '',
    system_sequence: '',
    system_suffix: '',
    stop_sequence: '',
    last_system_sequence: '',
    last_input_sequence: '',
    first_input_sequence: '',
    user_alignment_message: '',
    wrap: false,
    macro: true,
    names_behavior: 'force',
    activation_regex: '',
    skip_examples: false,
    system_same_as_user: false,
    sequences_as_stop_strings: false,
    story_string_prefix: '',
    story_string_suffix: '',
  };
}

export function createEmptyContext(name: string): StContextTemplate {
  return {
    name,
    story_string: '',
    example_separator: '',
    chat_start: '',
    use_stop_strings: false,
    names_as_stop_strings: false,
    story_string_position: 0,
    story_string_depth: 0,
    story_string_role: 0,
    always_force_name2: false,
    trim_sentences: false,
    single_line: false,
  };
}

export function createEmptySysprompt(name: string): StSystemPromptTemplate {
  return {
    name,
    content: '',
    post_history: '',
    prefill: '{{char}}:',
  };
}

export function createEmptyReasoning(name: string): StReasoningTemplate {
  return {
    name,
    prefix: '',
    suffix: '',
    separator: '',
  };
}

export function createEmptyOutput(name: string): StOutputTemplate {
  return {
    name,
    // Reasoning detection
    reasoning_prefix: '',
    reasoning_suffix: '',
    reasoning_separator: '',
    auto_parse_reasoning: true,
    // Stop strings
    custom_stop_strings: [],
    // Response processing
    trim_incomplete_sentences: false,
    single_line_mode: false,
  };
}
