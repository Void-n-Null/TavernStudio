import { memo, useEffect, useMemo, useState } from 'react';
import { useCharacterEditorStore } from '../../../store/characterEditorStore';
import { CharacterDetailInsights } from '../detail/CharacterDetailInsights';
import { TokenBudgetBar } from '../detail/TokenBudgetBar';
import { calculateApproxTokens } from './utils';

export const EditorInsightsSidebar = memo(function EditorInsightsSidebar() {
  const description = useCharacterEditorStore((s) => s.draft.data.description);
  const personality = useCharacterEditorStore((s) => s.draft.data.personality);
  const scenario = useCharacterEditorStore((s) => s.draft.data.scenario);
  const firstMessage = useCharacterEditorStore((s) => s.draft.data.first_mes);
  const alternateGreetings = useCharacterEditorStore((s) => s.draft.data.alternate_greetings);
  const exampleMessages = useCharacterEditorStore((s) => s.draft.data.mes_example);
  const systemPrompt = useCharacterEditorStore((s) => s.draft.data.system_prompt);
  const postHistoryInstructions = useCharacterEditorStore((s) => s.draft.data.post_history_instructions);
  const creatorNotes = useCharacterEditorStore((s) => s.draft.data.creator_notes);
  const name = useCharacterEditorStore((s) => s.draft.data.name);

  const approxTokens = useMemo(() => {
    return calculateApproxTokens([
      description,
      personality,
      scenario,
      firstMessage,
      (alternateGreetings || []).join('\n\n'),
      exampleMessages,
      systemPrompt,
      postHistoryInstructions,
      creatorNotes,
    ]);
  }, [
    alternateGreetings,
    creatorNotes,
    description,
    exampleMessages,
    firstMessage,
    personality,
    postHistoryInstructions,
    scenario,
    systemPrompt,
  ]);

  const insightsInput = useMemo(
    () => ({
      name,
      description,
      personality,
      scenario,
      firstMessage,
      alternateGreetings,
      exampleMessages,
      systemPrompt,
      postHistoryInstructions,
      creatorNotes,
    }),
    [
      alternateGreetings,
      creatorNotes,
      description,
      exampleMessages,
      firstMessage,
      name,
      personality,
      postHistoryInstructions,
      scenario,
      systemPrompt,
    ]
  );

  const [totalTokens, setTotalTokens] = useState<number | null>(null);
  useEffect(() => {
    setTotalTokens(null);
  }, [insightsInput]);

  return (
    <>
      <TokenBudgetBar totalTokens={totalTokens ?? approxTokens} loading={totalTokens === null} />
      <CharacterDetailInsights input={insightsInput} onTokensCalculated={setTotalTokens} />
    </>
  );
});

