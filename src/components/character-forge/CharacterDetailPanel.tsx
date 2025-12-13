/**
 * CharacterDetailPanel - Read-only beautiful display of a character.
 */

import { useState } from 'react';
import { X, Pencil, Download, Copy, User, ChevronDown, ChevronUp } from 'lucide-react';
import { useCharacterCard, getAvatarUrlVersioned, getExportPngUrl, getExportJsonUrl } from '../../hooks/queries/useCharacterCards';
import type { TavernCardV2 } from '../../types/characterCard';
import { Button } from '../ui/button';

interface CharacterDetailPanelProps {
  cardId: string;
  onEdit: () => void;
  onClose: () => void;
}

interface ExpandableSectionProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  empty?: boolean;
}

function ExpandableSection({ title, children, defaultExpanded = true, empty }: ExpandableSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  
  if (empty) return null;
  
  return (
    <div className="border-b border-zinc-800/50 last:border-b-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-6 py-3 text-left hover:bg-zinc-800/20"
      >
        <span className="text-sm font-medium text-zinc-300">{title}</span>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-zinc-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-zinc-500" />
        )}
      </button>
      {expanded && (
        <div className="px-6 pb-4">
          {children}
        </div>
      )}
    </div>
  );
}


export function CharacterDetailPanel({ cardId, onEdit, onClose }: CharacterDetailPanelProps) {
  const { data: card, isLoading, error } = useCharacterCard(cardId);
  const [imgError, setImgError] = useState(false);
  
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

  const handleExportPng = () => {
    if (card.has_png) {
      window.open(getExportPngUrl(cardId), '_blank');
    }
  };
  
  const handleExportJson = () => {
    window.open(getExportJsonUrl(cardId), '_blank');
  };
  
  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(card.raw_json);
      // TODO: show toast
    } catch {
      // Fallback
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-zinc-950/50">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-800/50 bg-zinc-950/80 px-6 py-4">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="relative h-14 w-14 overflow-hidden rounded-xl bg-zinc-800 shadow-lg ring-2 ring-zinc-700/50">
            {card.has_png && !imgError ? (
              <img
                src={getAvatarUrlVersioned(cardId, card.png_sha256)}
                alt={name}
                className="h-full w-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-zinc-600">
                <User className="h-7 w-7" />
              </div>
            )}
          </div>
          
          <div>
            <h2 
              className="text-xl font-bold text-zinc-100"
              style={{ fontFamily: '"Instrument Serif", Georgia, serif' }}
            >
              {name}
            </h2>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-zinc-500">
              <span className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono">{specLabel}</span>
              {creator && <span>by {creator}</span>}
              {characterVersion && <span>v{characterVersion}</span>}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleCopyJson}>
            <Copy className="mr-1.5 h-3.5 w-3.5" />
            Copy
          </Button>
          <Button size="sm" variant="outline" onClick={handleExportJson}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            JSON
          </Button>
          {card.has_png && (
            <Button size="sm" variant="outline" onClick={handleExportPng}>
              <Download className="mr-1.5 h-3.5 w-3.5" />
              PNG
            </Button>
          )}
          <Button 
            size="sm" 
            onClick={onEdit}
            className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white"
          >
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Edit
          </Button>
          <button
            onClick={onClose}
            className="ml-2 rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
      
      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex shrink-0 flex-wrap gap-1.5 border-b border-zinc-800/50 bg-zinc-950/60 px-6 py-3">
          {tags.map((tag, i) => (
            <span
              key={i}
              className="rounded-full bg-violet-500/20 px-2.5 py-0.5 text-xs font-medium text-violet-300"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <ExpandableSection title="Description" empty={!description}>
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
            {description}
          </div>
        </ExpandableSection>
        
        <ExpandableSection title="Personality" empty={!personality}>
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
            {personality}
          </div>
        </ExpandableSection>
        
        <ExpandableSection title="Scenario" empty={!scenario}>
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
            {scenario}
          </div>
        </ExpandableSection>
        
        <ExpandableSection title="First Message" empty={!firstMessage}>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-sm leading-relaxed text-zinc-300">
            {firstMessage}
          </div>
          {alternateGreetings.length > 0 && (
            <div className="mt-3">
              <div className="mb-2 text-xs font-medium text-zinc-500">
                +{alternateGreetings.length} alternate greeting{alternateGreetings.length !== 1 ? 's' : ''}
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {alternateGreetings.map((greeting, i) => (
                  <div
                    key={i}
                    className="min-w-[200px] max-w-[300px] shrink-0 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3"
                  >
                    <div className="mb-1 text-xs font-medium text-zinc-500">Alt {i + 1}</div>
                    <div className="line-clamp-4 text-xs text-zinc-400">
                      {greeting}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ExpandableSection>
        
        <ExpandableSection title="Example Messages" defaultExpanded={false} empty={!exampleMessages}>
          <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-zinc-400">
            {exampleMessages}
          </pre>
        </ExpandableSection>
        
        <ExpandableSection title="System Prompt Override" defaultExpanded={false} empty={!systemPrompt}>
          <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-zinc-400">
            {systemPrompt}
          </pre>
        </ExpandableSection>
        
        <ExpandableSection title="Post-History Instructions" defaultExpanded={false} empty={!postHistoryInstructions}>
          <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-zinc-400">
            {postHistoryInstructions}
          </pre>
        </ExpandableSection>
        
        <ExpandableSection title="Creator Notes" defaultExpanded={false} empty={!creatorNotes}>
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-400">
            {creatorNotes}
          </div>
        </ExpandableSection>
      </div>
    </div>
  );
}

