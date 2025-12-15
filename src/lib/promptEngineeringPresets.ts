import type { SillyTavernAdvancedFormattingImport } from './sillyTavernAdvancedFormatting';
import type { PromptEngineeringPreset } from '../types/promptEngineering';

function pickPresetName(imported: SillyTavernAdvancedFormattingImport): string {
  return (
    imported.instruct?.name ||
    imported.context?.name ||
    imported.sysprompt?.name ||
    imported.reasoning?.name ||
    'Imported'
  );
}

export function promptEngineeringPresetFromSillyTavernImport(
  imported: SillyTavernAdvancedFormattingImport
): PromptEngineeringPreset {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    name: pickPresetName(imported),
    createdAt: now,
    updatedAt: now,
    source: 'sillytavern',
    instruct: imported.instruct,
    context: imported.context,
    sysprompt: imported.sysprompt,
    reasoning: imported.reasoning,
    unknownSections: imported.unknownSections,
  };
}
