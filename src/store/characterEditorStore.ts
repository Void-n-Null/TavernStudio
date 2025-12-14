import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { TavernCardV2 } from '../types/characterCard';

function createEmptyCard(): TavernCardV2 {
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

interface CharacterEditorState {
  cardId: string | null;
  draft: TavernCardV2;
  isDirty: boolean;
  dirtyVersion: number;

  loadDraft: (cardId: string | null, draft: TavernCardV2) => void;
  replaceDraft: (draft: TavernCardV2, opts?: { markDirty?: boolean }) => void;
  reset: () => void;

  setField: <K extends keyof TavernCardV2['data']>(field: K, value: TavernCardV2['data'][K]) => void;
  setExtensions: (extensions: Record<string, unknown>) => void;
  setExtensionField: (key: string, value: unknown) => void;

  markSavedIfVersionMatches: (version: number) => void;
}

export const useCharacterEditorStore = create<CharacterEditorState>()(
  subscribeWithSelector((set, get) => ({
    cardId: null,
    draft: createEmptyCard(),
    isDirty: false,
    dirtyVersion: 0,

    loadDraft: (cardId, draft) =>
      set({
        cardId,
        draft,
        isDirty: false,
        dirtyVersion: 0,
      }),

    replaceDraft: (draft, opts) => {
      const markDirty = Boolean(opts?.markDirty);
      set({
        draft,
        isDirty: markDirty ? true : get().isDirty,
        dirtyVersion: markDirty ? get().dirtyVersion + 1 : get().dirtyVersion,
      });
    },

    reset: () =>
      set({
        cardId: null,
        draft: createEmptyCard(),
        isDirty: false,
        dirtyVersion: 0,
      }),

    setField: (field, value) => {
      const prev = get().draft;
      set({
        draft: {
          ...prev,
          data: {
            ...prev.data,
            [field]: value,
          },
        },
        isDirty: true,
        dirtyVersion: get().dirtyVersion + 1,
      });
    },

    setExtensions: (extensions) => {
      const prev = get().draft;
      set({
        draft: {
          ...prev,
          data: {
            ...prev.data,
            extensions,
          },
        },
        isDirty: true,
        dirtyVersion: get().dirtyVersion + 1,
      });
    },

    setExtensionField: (key, value) => {
      const prev = get().draft;
      const nextExt = { ...(prev.data.extensions || {}) } as Record<string, unknown>;
      nextExt[key] = value;
      set({
        draft: {
          ...prev,
          data: {
            ...prev.data,
            extensions: nextExt,
          },
        },
        isDirty: true,
        dirtyVersion: get().dirtyVersion + 1,
      });
    },

    markSavedIfVersionMatches: (version) => {
      if (get().dirtyVersion !== version) return;
      set({ isDirty: false });
    },
  }))
);

export function getCharacterEditorDraftSnapshot(): TavernCardV2 {
  return useCharacterEditorStore.getState().draft;
}
