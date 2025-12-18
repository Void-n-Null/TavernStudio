import { memo, useCallback } from 'react';
import { useCharacterEditorStore } from '../../../store/characterEditorStore';
import type { TavernCardV2 } from '../../../types/characterCard';
import { CharacterNoteSection } from '../sections/CharacterNoteSection';
import { CoreFieldsSection } from '../sections/CoreFieldsSection';
import { CreatorMetadataSection } from '../sections/CreatorMetadataSection';
import { ExampleMessagesSection } from '../sections/ExampleMessagesSection';
import { GreetingSection } from '../sections/GreetingSection';
import { PromptOverridesSection } from '../sections/PromptOverridesSection';

export const CoreSectionFields = memo(function CoreSectionFields() {
  const name = useCharacterEditorStore((s) => s.draft.data.name);
  const description = useCharacterEditorStore((s) => s.draft.data.description);
  const personality = useCharacterEditorStore((s) => s.draft.data.personality);
  const scenario = useCharacterEditorStore((s) => s.draft.data.scenario);
  const setField = useCharacterEditorStore((s) => s.setField);

  const onChange = useCallback(
    (field: keyof TavernCardV2['data'], value: unknown) => {
      setField(field as any, value as any);
    },
    [setField]
  );

  return (
    <CoreFieldsSection
      name={name}
      description={description}
      personality={personality}
      scenario={scenario}
      onChange={onChange as any}
    />
  );
});

export const GreetingsSectionFields = memo(function GreetingsSectionFields() {
  const firstMessage = useCharacterEditorStore((s) => s.draft.data.first_mes);
  const alternateGreetings = useCharacterEditorStore((s) => s.draft.data.alternate_greetings);
  const characterName = useCharacterEditorStore((s) => s.draft.data.name);
  const setField = useCharacterEditorStore((s) => s.setField);

  const onChange = useCallback(
    (field: 'first_mes' | 'alternate_greetings', value: string | string[]) => {
      setField(field, value as any);
    },
    [setField]
  );

  return (
    <GreetingSection
      firstMessage={firstMessage}
      alternateGreetings={alternateGreetings}
      characterName={characterName}
      userLabel="User"
      onChange={onChange as any}
    />
  );
});

export const ExamplesSectionFields = memo(function ExamplesSectionFields() {
  const exampleMessages = useCharacterEditorStore((s) => s.draft.data.mes_example);
  const characterName = useCharacterEditorStore((s) => s.draft.data.name);
  const setField = useCharacterEditorStore((s) => s.setField);

  const onChange = useCallback((value: string) => setField('mes_example', value), [setField]);

  return <ExampleMessagesSection exampleMessages={exampleMessages} characterName={characterName} onChange={onChange} />;
});

export const PromptsSectionFields = memo(function PromptsSectionFields() {
  const systemPrompt = useCharacterEditorStore((s) => s.draft.data.system_prompt);
  const postHistoryInstructions = useCharacterEditorStore((s) => s.draft.data.post_history_instructions);
  const setField = useCharacterEditorStore((s) => s.setField);

  const onChange = useCallback(
    (field: 'system_prompt' | 'post_history_instructions', value: string) => {
      setField(field, value as any);
    },
    [setField]
  );

  return <PromptOverridesSection systemPrompt={systemPrompt} postHistoryInstructions={postHistoryInstructions} onChange={onChange as any} />;
});

export const MetadataSectionFields = memo(function MetadataSectionFields() {
  const creator = useCharacterEditorStore((s) => s.draft.data.creator);
  const characterVersion = useCharacterEditorStore((s) => s.draft.data.character_version);
  const creatorNotes = useCharacterEditorStore((s) => s.draft.data.creator_notes);
  const tags = useCharacterEditorStore((s) => s.draft.data.tags);
  const setField = useCharacterEditorStore((s) => s.setField);

  const onChange = useCallback(
    (field: 'creator' | 'character_version' | 'creator_notes' | 'tags', value: string | string[]) => {
      setField(field, value as any);
    },
    [setField]
  );

  return (
    <CreatorMetadataSection
      creator={creator}
      characterVersion={characterVersion}
      creatorNotes={creatorNotes}
      tags={tags}
      onChange={onChange as any}
    />
  );
});

export const NoteSectionFields = memo(function NoteSectionFields() {
  const ext = useCharacterEditorStore((s) => s.draft.data.extensions || {});
  const setExtensionField = useCharacterEditorStore((s) => s.setExtensionField);

  const characterNote = (ext.character_note as string) || '';
  const noteDepth = (ext.note_depth as number) || 0;
  const noteRole = (ext.note_role as 'system' | 'user' | 'assistant') || 'system';

  const onChange = useCallback(
    (field: 'character_note' | 'note_depth' | 'note_role', value: string | number) => {
      setExtensionField(field, value);
    },
    [setExtensionField]
  );

  return <CharacterNoteSection characterNote={characterNote} noteDepth={noteDepth} noteRole={noteRole} onChange={onChange as any} />;
});



