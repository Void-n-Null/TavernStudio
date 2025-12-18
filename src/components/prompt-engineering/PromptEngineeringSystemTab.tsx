import type { PromptEngineeringPreset } from '../../types/promptEngineering';
import { MacroHighlightTextarea } from '../character-forge/MacroHighlightTextarea';
import { PromptSectionTitle, createEmptySysprompt } from './promptEngineeringEditorShared';

/** Check if a string has meaningful content (not just whitespace) */
function hasContent(value: string | undefined): boolean {
  return !!value?.trim();
}

export function PromptEngineeringSystemTab({
  preset,
  onChange,
  isMobile,
}: {
  preset: PromptEngineeringPreset;
  onChange: (next: PromptEngineeringPreset) => void;
  isMobile: boolean;
}) {
  // Auto-initialize sysprompt if it doesn't exist
  const sysprompt = preset.sysprompt ?? createEmptySysprompt(preset.name);
  
  const updateField = <K extends keyof typeof sysprompt>(key: K, value: (typeof sysprompt)[K]) => {
    onChange({ ...preset, sysprompt: { ...sysprompt, [key]: value } });
  };

  return (
    <div className="space-y-6">
      {/* System Prompt */}
      <div className="space-y-2">
        <PromptSectionTitle
          title="System Prompt"
          hasContent={hasContent(sysprompt.content)}
        />
        <MacroHighlightTextarea
          value={sysprompt.content}
          onChange={(content) => updateField('content', content)}
          placeholder={`Write {{char}}'s next reply in a fictional chat between {{char}} and {{user}}.`}
          rows={8}
          maxRows={isMobile ? 12 : 16}
        />
      </div>

      {/* Post-History Instructions */}
      <div className="space-y-2">
        <PromptSectionTitle
          title="Post-History Instructions"
          hasContent={hasContent(sysprompt.post_history)}
        />
        <MacroHighlightTextarea
          value={sysprompt.post_history ?? ''}
          onChange={(post_history) => updateField('post_history', post_history)}
          placeholder={`[Continue the roleplay. Stay in character as {{char}}. Be creative and engaging.]`}
          rows={5}
          maxRows={isMobile ? 8 : 10}
        />
      </div>

      {/* Prefill */}
      <div className="space-y-2">
        <PromptSectionTitle
          title="Prefill (Assistant Start)"
          hasContent={hasContent(sysprompt.prefill)}
        />
        <MacroHighlightTextarea
          value={sysprompt.prefill ?? ''}
          onChange={(prefill) => updateField('prefill', prefill)}
          placeholder={`{{char}}:`}
          rows={2}
          maxRows={4}
        />
      </div>
    </div>
  );
}
