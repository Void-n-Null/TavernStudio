import type { TavernCardV2 } from '../../../types/characterCard';
import { validateCharacterCard, type ValidationLevel } from '../ValidationBadge';
import type { EditorSection } from './types';

export function computeEditorMessages(draft: TavernCardV2): Array<{ level: ValidationLevel; message: string; field?: string }> {
  const validationMessages = validateCharacterCard(draft);
  const msgs: Array<{ level: ValidationLevel; message: string; field?: string }> = [...validationMessages];

  if (!draft.data.mes_example?.trim()) {
    msgs.push({ level: 'info', message: 'Example messages are empty', field: 'mes_example' });
  }

  const emptyAlt = (draft.data.alternate_greetings || []).some((g) => !String(g || '').trim());
  if (emptyAlt) {
    msgs.push({ level: 'warning', message: 'One or more alternate greetings are empty', field: 'alternate_greetings' });
  }

  const tags = (draft.data.tags || []).map((t) => String(t || ''));
  if (tags.some((t) => !t.trim())) {
    msgs.push({ level: 'warning', message: 'One or more tags are empty', field: 'tags' });
  }

  return msgs;
}

export function computeSectionIssueSummary(draft: TavernCardV2): Partial<Record<EditorSection, { count: number; worst: ValidationLevel }>> {
  const msgs = computeEditorMessages(draft);

  const fieldToSection: Record<string, EditorSection> = {
    name: 'core',
    description: 'core',
    personality: 'core',
    scenario: 'core',

    first_mes: 'greetings',
    alternate_greetings: 'greetings',

    mes_example: 'examples',

    system_prompt: 'prompts',
    post_history_instructions: 'prompts',

    creator: 'metadata',
    character_version: 'metadata',
    creator_notes: 'metadata',
    tags: 'metadata',

    character_note: 'note',
    note_depth: 'note',
    note_role: 'note',
  };

  const order: Record<ValidationLevel, number> = { error: 0, warning: 1, info: 2, success: 3 };
  const out: Partial<Record<EditorSection, { count: number; worst: ValidationLevel }>> = {};

  for (const msg of msgs) {
    if (!msg.field) continue;
    const section = fieldToSection[msg.field];
    if (!section) continue;
    const existing = out[section];
    if (!existing) {
      out[section] = { count: 1, worst: msg.level };
    } else {
      existing.count += 1;
      if (order[msg.level] < order[existing.worst]) existing.worst = msg.level;
    }
  }

  return out;
}

export function shallowEqualSectionIssueSummary(
  a: Partial<Record<EditorSection, { count: number; worst: ValidationLevel }>>,
  b: Partial<Record<EditorSection, { count: number; worst: ValidationLevel }>>
): boolean {
  if (a === b) return true;
  const sections: EditorSection[] = ['core', 'greetings', 'examples', 'prompts', 'metadata', 'note'];
  for (const s of sections) {
    const av = a[s];
    const bv = b[s];
    if (!av && !bv) continue;
    if (!av || !bv) return false;
    if (av.count !== bv.count) return false;
    if (av.worst !== bv.worst) return false;
  }
  return true;
}

export function shallowEqualEditorMessages(
  a: Array<{ level: ValidationLevel; message: string; field?: string }>,
  b: Array<{ level: ValidationLevel; message: string; field?: string }>
): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const ai = a[i];
    const bi = b[i];
    if (ai.level !== bi.level) return false;
    if (ai.message !== bi.message) return false;
    if ((ai.field || '') !== (bi.field || '')) return false;
  }
  return true;
}

