import { User, FileText, MessageSquare, Wand2, Settings2, Tag, StickyNote } from 'lucide-react';
import type { TavernCardV2 } from '../../../types/characterCard';

export type EditorSection = 'core' | 'greetings' | 'examples' | 'prompts' | 'metadata' | 'note';

export const SECTIONS: Array<{ id: EditorSection; label: string; icon: typeof User }> = [
  { id: 'core', label: 'Core', icon: FileText },
  { id: 'greetings', label: 'Greetings', icon: MessageSquare },
  { id: 'examples', label: 'Examples', icon: Wand2 },
  { id: 'prompts', label: 'Prompts', icon: Settings2 },
  { id: 'metadata', label: 'Metadata', icon: Tag },
  { id: 'note', label: 'Note', icon: StickyNote },
];

export function createEmptyCard(): TavernCardV2 {
  return {
    spec: 'chara_card_v2',
    spec_version: '2.0',
    data: {
      name: '',
      description: '',
      personality: '',
      scenario: '',
      first_mes: '',
      mes_example: '',
      creator_notes: '',
      system_prompt: '',
      post_history_instructions: '',
      alternate_greetings: [],
      tags: [],
      creator: '',
      character_version: '',
      extensions: {},
    },
  };
}

export function normalizeToV2Card(input: unknown): TavernCardV2 {
  if (input && typeof input === 'object') {
    const parsed = input as any;
    if (parsed.spec === 'chara_card_v2' || parsed.spec === 'chara_card_v3') {
      return parsed as TavernCardV2;
    }
    if (parsed.data && typeof parsed.data === 'object') {
      return parsed as TavernCardV2;
    }
    // V1 card - wrap in V2 structure
    return {
      spec: 'chara_card_v2',
      spec_version: '2.0',
      data: {
        name: parsed.name || '',
        description: parsed.description || '',
        personality: parsed.personality || '',
        scenario: parsed.scenario || '',
        first_mes: parsed.first_mes || '',
        mes_example: parsed.mes_example || '',
        creator_notes: '',
        system_prompt: '',
        post_history_instructions: '',
        alternate_greetings: [],
        tags: [],
        creator: '',
        character_version: '',
        extensions: {},
      },
    };
  }
  return createEmptyCard();
}

