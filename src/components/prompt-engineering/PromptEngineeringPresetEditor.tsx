import { useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Input } from '../ui/input';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { cn } from '../../lib/utils';
import type {
  PromptEngineeringPreset,
} from '../../types/promptEngineering';
import type {
  StContextTemplate,
  StInstructTemplate,
  StReasoningTemplate,
  StSystemPromptTemplate,
} from '../../lib/sillyTavernAdvancedFormatting';
import { MacroHighlightTextarea } from '../character-forge/MacroHighlightTextarea';

function boolFieldRow({
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

function numberInput(
  v: number,
  onChange: (next: number) => void
): { value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void } {
  return {
    value: Number.isFinite(v) ? String(v) : '0',
    onChange: (e) => {
      const n = Number(e.target.value);
      onChange(Number.isFinite(n) ? n : 0);
    },
  };
}

function createEmptyInstruct(name: string): StInstructTemplate {
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

function createEmptyContext(name: string): StContextTemplate {
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

function createEmptySysprompt(name: string): StSystemPromptTemplate {
  return {
    name,
    content: '',
    post_history: '',
  };
}

function createEmptyReasoning(name: string): StReasoningTemplate {
  return {
    name,
    prefix: '',
    suffix: '',
    separator: '',
  };
}

export function PromptEngineeringPresetEditor({
  preset,
  onChange,
  isMobile,
}: {
  preset: PromptEngineeringPreset;
  onChange: (next: PromptEngineeringPreset) => void;
  isMobile: boolean;
}) {
  const tabDefault = useMemo(() => {
    if (preset.sysprompt) return 'sysprompt';
    if (preset.instruct) return 'instruct';
    if (preset.context) return 'context';
    if (preset.reasoning) return 'reasoning';
    return 'sysprompt';
  }, [preset.context, preset.instruct, preset.reasoning, preset.sysprompt]);

  return (
    <div className="space-y-3">
      <Tabs defaultValue={tabDefault}>
        <TabsList className={cn('w-full grid gap-1', isMobile ? 'grid-cols-2' : 'grid-cols-4')}>
          <TabsTrigger className="w-full justify-center" value="sysprompt">
            System
          </TabsTrigger>
          <TabsTrigger className="w-full justify-center" value="instruct">
            Instruct
          </TabsTrigger>
          <TabsTrigger className="w-full justify-center" value="context">
            Context
          </TabsTrigger>
          <TabsTrigger className="w-full justify-center" value="reasoning">
            Reasoning
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sysprompt">
          <SectionWrapper
            title="System prompt"
            enabled={!!preset.sysprompt}
            onEnable={(enabled) => {
              if (!enabled) return onChange({ ...preset, sysprompt: undefined });
              const name = preset.sysprompt?.name || preset.name;
              return onChange({ ...preset, sysprompt: createEmptySysprompt(name) });
            }}
          >
            {preset.sysprompt ? (
              <div className="space-y-3">
                <MacroHighlightTextarea
                  value={preset.sysprompt.content}
                  onChange={(content) => onChange({ ...preset, sysprompt: { ...preset.sysprompt!, content } })}
                  label="System content"
                  description="Primary system prompt content"
                  rows={10}
                  maxRows={isMobile ? 14 : 18}
                />
                <MacroHighlightTextarea
                  value={preset.sysprompt.post_history ?? ''}
                  onChange={(post_history) => onChange({ ...preset, sysprompt: { ...preset.sysprompt!, post_history } })}
                  label="Post-history instructions"
                  description="Instructions inserted after chat history"
                  rows={6}
                  maxRows={isMobile ? 10 : 12}
                />
              </div>
            ) : null}
          </SectionWrapper>
        </TabsContent>

        <TabsContent value="instruct">
          <SectionWrapper
            title="Instruct template"
            enabled={!!preset.instruct}
            onEnable={(enabled) => {
              if (!enabled) return onChange({ ...preset, instruct: undefined });
              const name = preset.instruct?.name || preset.name;
              return onChange({ ...preset, instruct: createEmptyInstruct(name) });
            }}
          >
            {preset.instruct ? (
              <div className="space-y-3">
                <details open>
                  <summary className="cursor-pointer select-none text-sm font-medium text-zinc-200">
                    Basics
                  </summary>
                  <div className="mt-3 space-y-3">
                    {boolFieldRow({
                      label: 'Enable macros',
                      checked: preset.instruct.macro,
                      onCheckedChange: (macro) =>
                        onChange({ ...preset, instruct: { ...preset.instruct!, macro } }),
                      description: 'Allow {{char}}, {{user}}, and other macros',
                    })}
                    {boolFieldRow({
                      label: 'Wrap sequences',
                      checked: preset.instruct.wrap,
                      onCheckedChange: (wrap) => onChange({ ...preset, instruct: { ...preset.instruct!, wrap } }),
                      description: 'Wrap message content using the sequence format',
                    })}
                    <div className="rounded-lg border border-zinc-800/50 bg-zinc-900/30 p-3 space-y-2">
                      <Label>Activation regex</Label>
                      <Input
                        value={preset.instruct.activation_regex}
                        onChange={(e) =>
                          onChange({
                            ...preset,
                            instruct: { ...preset.instruct!, activation_regex: e.target.value },
                          })
                        }
                        placeholder="Optional: auto-activate by model regex"
                      />
                    </div>
                  </div>
                </details>

                <details>
                  <summary className="cursor-pointer select-none text-sm font-medium text-zinc-200">
                    Sequences
                  </summary>
                  <div className="mt-3 space-y-3">
                    <MacroHighlightTextarea
                      value={preset.instruct.system_sequence}
                      onChange={(system_sequence) =>
                        onChange({ ...preset, instruct: { ...preset.instruct!, system_sequence } })
                      }
                      label="System sequence"
                      rows={3}
                      maxRows={6}
                    />
                    <MacroHighlightTextarea
                      value={preset.instruct.input_sequence}
                      onChange={(input_sequence) =>
                        onChange({ ...preset, instruct: { ...preset.instruct!, input_sequence } })
                      }
                      label="User input sequence"
                      rows={3}
                      maxRows={6}
                    />
                    <MacroHighlightTextarea
                      value={preset.instruct.output_sequence}
                      onChange={(output_sequence) =>
                        onChange({ ...preset, instruct: { ...preset.instruct!, output_sequence } })
                      }
                      label="Assistant output sequence"
                      rows={3}
                      maxRows={6}
                    />

                    <MacroHighlightTextarea
                      value={preset.instruct.system_suffix}
                      onChange={(system_suffix) =>
                        onChange({ ...preset, instruct: { ...preset.instruct!, system_suffix } })
                      }
                      label="System suffix"
                      rows={2}
                      maxRows={4}
                    />
                    <MacroHighlightTextarea
                      value={preset.instruct.input_suffix}
                      onChange={(input_suffix) =>
                        onChange({ ...preset, instruct: { ...preset.instruct!, input_suffix } })
                      }
                      label="User suffix"
                      rows={2}
                      maxRows={4}
                    />
                    <MacroHighlightTextarea
                      value={preset.instruct.output_suffix}
                      onChange={(output_suffix) =>
                        onChange({ ...preset, instruct: { ...preset.instruct!, output_suffix } })
                      }
                      label="Assistant suffix"
                      rows={2}
                      maxRows={4}
                    />

                    <MacroHighlightTextarea
                      value={preset.instruct.stop_sequence}
                      onChange={(stop_sequence) =>
                        onChange({ ...preset, instruct: { ...preset.instruct!, stop_sequence } })
                      }
                      label="Stop sequence"
                      rows={2}
                      maxRows={4}
                    />
                  </div>
                </details>

                <details>
                  <summary className="cursor-pointer select-none text-sm font-medium text-zinc-200">
                    Advanced
                  </summary>
                  <div className="mt-3 space-y-3">
                    {boolFieldRow({
                      label: 'Skip examples',
                      checked: preset.instruct.skip_examples,
                      onCheckedChange: (skip_examples) =>
                        onChange({ ...preset, instruct: { ...preset.instruct!, skip_examples } }),
                    })}
                    {boolFieldRow({
                      label: 'System same as user',
                      checked: preset.instruct.system_same_as_user,
                      onCheckedChange: (system_same_as_user) =>
                        onChange({ ...preset, instruct: { ...preset.instruct!, system_same_as_user } }),
                    })}
                    {boolFieldRow({
                      label: 'Sequences as stop strings',
                      checked: preset.instruct.sequences_as_stop_strings,
                      onCheckedChange: (sequences_as_stop_strings) =>
                        onChange({
                          ...preset,
                          instruct: { ...preset.instruct!, sequences_as_stop_strings },
                        }),
                    })}
                    <MacroHighlightTextarea
                      value={preset.instruct.user_alignment_message}
                      onChange={(user_alignment_message) =>
                        onChange({ ...preset, instruct: { ...preset.instruct!, user_alignment_message } })
                      }
                      label="User alignment message"
                      rows={3}
                      maxRows={6}
                    />
                  </div>
                </details>
              </div>
            ) : null}
          </SectionWrapper>
        </TabsContent>

        <TabsContent value="context">
          <SectionWrapper
            title="Context template"
            enabled={!!preset.context}
            onEnable={(enabled) => {
              if (!enabled) return onChange({ ...preset, context: undefined });
              const name = preset.context?.name || preset.name;
              return onChange({ ...preset, context: createEmptyContext(name) });
            }}
          >
            {preset.context ? (
              <div className="space-y-3">
                <MacroHighlightTextarea
                  value={preset.context.story_string}
                  onChange={(story_string) => onChange({ ...preset, context: { ...preset.context!, story_string } })}
                  label="Story string"
                  description="How context and story are formatted"
                  rows={10}
                  maxRows={isMobile ? 14 : 18}
                />

                <div className={cn('grid gap-3', isMobile ? 'grid-cols-1' : 'grid-cols-2')}>
                  <MacroHighlightTextarea
                    value={preset.context.chat_start}
                    onChange={(chat_start) => onChange({ ...preset, context: { ...preset.context!, chat_start } })}
                    label="Chat start"
                    rows={3}
                    maxRows={6}
                  />
                  <MacroHighlightTextarea
                    value={preset.context.example_separator}
                    onChange={(example_separator) =>
                      onChange({ ...preset, context: { ...preset.context!, example_separator } })
                    }
                    label="Example separator"
                    rows={3}
                    maxRows={6}
                  />
                </div>

                <details>
                  <summary className="cursor-pointer select-none text-sm font-medium text-zinc-200">
                    Behavior
                  </summary>
                  <div className="mt-3 space-y-3">
                    {boolFieldRow({
                      label: 'Use stop strings',
                      checked: preset.context.use_stop_strings,
                      onCheckedChange: (use_stop_strings) =>
                        onChange({ ...preset, context: { ...preset.context!, use_stop_strings } }),
                    })}
                    {boolFieldRow({
                      label: 'Names as stop strings',
                      checked: preset.context.names_as_stop_strings,
                      onCheckedChange: (names_as_stop_strings) =>
                        onChange({ ...preset, context: { ...preset.context!, names_as_stop_strings } }),
                    })}
                    {boolFieldRow({
                      label: 'Always force Name2',
                      checked: preset.context.always_force_name2,
                      onCheckedChange: (always_force_name2) =>
                        onChange({ ...preset, context: { ...preset.context!, always_force_name2 } }),
                    })}
                    {boolFieldRow({
                      label: 'Trim sentences',
                      checked: preset.context.trim_sentences,
                      onCheckedChange: (trim_sentences) =>
                        onChange({ ...preset, context: { ...preset.context!, trim_sentences } }),
                    })}
                    {boolFieldRow({
                      label: 'Single line',
                      checked: preset.context.single_line,
                      onCheckedChange: (single_line) =>
                        onChange({ ...preset, context: { ...preset.context!, single_line } }),
                    })}

                    <div className={cn('grid gap-3', isMobile ? 'grid-cols-1' : 'grid-cols-3')}>
                      <div className="rounded-lg border border-zinc-800/50 bg-zinc-900/30 p-3 space-y-2">
                        <Label>Position</Label>
                        <Input
                          type="number"
                          {...numberInput(preset.context.story_string_position, (story_string_position) =>
                            onChange({
                              ...preset,
                              context: { ...preset.context!, story_string_position },
                            })
                          )}
                        />
                      </div>
                      <div className="rounded-lg border border-zinc-800/50 bg-zinc-900/30 p-3 space-y-2">
                        <Label>Depth</Label>
                        <Input
                          type="number"
                          {...numberInput(preset.context.story_string_depth, (story_string_depth) =>
                            onChange({
                              ...preset,
                              context: { ...preset.context!, story_string_depth },
                            })
                          )}
                        />
                      </div>
                      <div className="rounded-lg border border-zinc-800/50 bg-zinc-900/30 p-3 space-y-2">
                        <Label>Role</Label>
                        <Input
                          type="number"
                          {...numberInput(preset.context.story_string_role, (story_string_role) =>
                            onChange({
                              ...preset,
                              context: { ...preset.context!, story_string_role },
                            })
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </details>
              </div>
            ) : null}
          </SectionWrapper>
        </TabsContent>

        <TabsContent value="reasoning">
          <SectionWrapper
            title="Reasoning formatting"
            enabled={!!preset.reasoning}
            onEnable={(enabled) => {
              if (!enabled) return onChange({ ...preset, reasoning: undefined });
              const name = preset.reasoning?.name || preset.name;
              return onChange({ ...preset, reasoning: createEmptyReasoning(name) });
            }}
          >
            {preset.reasoning ? (
              <div className="space-y-3">
                <MacroHighlightTextarea
                  value={preset.reasoning.prefix}
                  onChange={(prefix) => onChange({ ...preset, reasoning: { ...preset.reasoning!, prefix } })}
                  label="Prefix"
                  rows={3}
                  maxRows={6}
                />
                <MacroHighlightTextarea
                  value={preset.reasoning.suffix}
                  onChange={(suffix) => onChange({ ...preset, reasoning: { ...preset.reasoning!, suffix } })}
                  label="Suffix"
                  rows={3}
                  maxRows={6}
                />
                <MacroHighlightTextarea
                  value={preset.reasoning.separator}
                  onChange={(separator) =>
                    onChange({ ...preset, reasoning: { ...preset.reasoning!, separator } })
                  }
                  label="Separator"
                  rows={3}
                  maxRows={6}
                />
              </div>
            ) : null}
          </SectionWrapper>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SectionWrapper({
  title,
  enabled,
  onEnable,
  children,
}: {
  title: string;
  enabled: boolean;
  onEnable: (enabled: boolean) => void;
  children: React.ReactNode;
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

      {enabled ? children : (
        <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/30 p-4 text-sm text-zinc-500">
          Disabled
        </div>
      )}
    </div>
  );
}
