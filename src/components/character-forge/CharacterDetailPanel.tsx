/**
 * CharacterDetailPanel - Read-only beautiful display of a character.
 */

// (no React imports needed)
import { useCharacterCard, getAvatarUrlVersioned, getExportPngUrl, getExportJsonUrl } from '../../hooks/queries/useCharacterCards';
import type { TavernCardV2 } from '../../types/characterCard';
import { showToast } from '../ui/toast';
import { CharacterDetailDashboard, type CharacterDetailDashboardData } from './CharacterDetailDashboard';

interface CharacterDetailPanelProps {
  cardId: string;
  onEdit: () => void;
  onClose: () => void;
}

export function CharacterDetailPanel({ cardId, onEdit, onClose }: CharacterDetailPanelProps) {
  const { data: card, isLoading, error } = useCharacterCard(cardId);
  
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-sm text-zinc-500">Loading character...</div>
      </div>
    );
  }
  
  if (error || !card) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-sm text-red-400">Failed to load character</div>
      </div>
    );
  }
  
  // Parse raw JSON to get full card data
  let parsedCard: TavernCardV2 | Record<string, unknown>;
  try {
    parsedCard = JSON.parse(card.raw_json);
  } catch {
    parsedCard = {};
  }
  
  // Extract data (V2 has data nested, V1 is flat)
  const data = (parsedCard as TavernCardV2).data || parsedCard;
  const name = (data as any).name || card.name;
  const description = (data as any).description || '';
  const personality = (data as any).personality || '';
  const scenario = (data as any).scenario || '';
  const firstMessage = (data as any).first_mes || '';
  const alternateGreetings: string[] = (data as any).alternate_greetings || [];
  const exampleMessages = (data as any).mes_example || '';
  const systemPrompt = (data as any).system_prompt || '';
  const postHistoryInstructions = (data as any).post_history_instructions || '';
  const creatorNotes = (data as any).creator_notes || '';
  const creator = (data as any).creator || '';
  const characterVersion = (data as any).character_version || '';
  const tags: string[] = (data as any).tags || [];
  
  const specLabel = card.spec 
    ? card.spec.replace('chara_card_', '').toUpperCase() 
    : 'V1';

  const avatarUrl = card.has_png ? getAvatarUrlVersioned(cardId, card.png_sha256) : null;

  const dashData: CharacterDetailDashboardData = {
    id: cardId,
    name,
    specLabel,
    createdAt: card.created_at,
    updatedAt: card.updated_at,
    hasPng: Boolean(card.has_png),
    avatarUrl,
    rawJson: card.raw_json,
    creator,
    characterVersion,
    tags,
    description,
    personality,
    scenario,
    firstMessage,
    alternateGreetings,
    exampleMessages,
    systemPrompt,
    postHistoryInstructions,
    creatorNotes,
  };

  return (
    <CharacterDetailDashboard
      data={dashData}
      onEdit={onEdit}
      onClose={onClose}
      onCopyJson={async () => {
        try {
          await navigator.clipboard.writeText(card.raw_json);
          showToast({ message: 'Copied JSON to clipboard', type: 'success' });
        } catch {
          showToast({ message: 'Failed to copy JSON', type: 'error' });
        }
      }}
      onExportJson={() => window.open(getExportJsonUrl(cardId), '_blank')}
      onExportPng={() => {
        if (card.has_png) window.open(getExportPngUrl(cardId), '_blank');
      }}
    />
  );
}

