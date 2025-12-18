/**
 * Models Tab
 * 
 * Unified model browser with cross-provider matching and detail panel.
 */

import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Search, Star, Cpu, Image, Mic, FileText, Brain, Sparkles,
  DollarSign, Infinity, ChevronDown, ChevronUp, Check, X, ExternalLink,
  GitCompare
} from 'lucide-react';
import { openRouterModels, type OpenRouterModel } from '../../../api/client';
import { queryKeys } from '../../../lib/queryClient';
import { cn } from '../../../lib/utils';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import { addToRecentModels, togglePinnedModel } from '../QuickActionsBar';
import { ModelComparison } from '../ModelComparison';

interface ModelsTabProps {
  isMobile: boolean;
}

// Filter types
type FilterGroup = 'all' | 'openai' | 'anthropic' | 'google' | 'meta' | 'mistral' | 'other';
type ModalityFilter = 'all' | 'text' | 'image' | 'audio';

export function ModelsTab({ isMobile }: ModelsTabProps) {
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState<FilterGroup>('all');
  const [modalityFilter, setModalityFilter] = useState<ModalityFilter>('all');
  const [showFreeOnly, setShowFreeOnly] = useState(false);
  const [showReasoningOnly, setShowReasoningOnly] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [compareModelIds, setCompareModelIds] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);

  // Fetch OpenRouter models
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.openRouterModels.list(),
    queryFn: () => openRouterModels.list().then(r => r.models),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const models = data ?? [];

  // Extract unique groups for filtering
  const groups = useMemo(() => {
    const gs = new Set<string>();
    models.forEach(m => gs.add(m.group.toLowerCase()));
    return Array.from(gs).sort();
  }, [models]);

  // Filter and search models
  const filteredModels = useMemo(() => {
    let result = models;

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(m => 
        m.name.toLowerCase().includes(q) ||
        m.shortName.toLowerCase().includes(q) ||
        m.author.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q)
      );
    }

    // Group filter
    if (groupFilter !== 'all') {
      const groupMap: Record<FilterGroup, string[]> = {
        all: [],
        openai: ['openai', 'gpt'],
        anthropic: ['anthropic', 'claude'],
        google: ['google', 'gemini'],
        meta: ['meta', 'llama'],
        mistral: ['mistral'],
        other: [],
      };
      const keywords = groupMap[groupFilter];
      if (keywords.length > 0) {
        result = result.filter(m => {
          const group = m.group.toLowerCase();
          const author = m.author.toLowerCase();
          return keywords.some(k => group.includes(k) || author.includes(k));
        });
      } else if (groupFilter === 'other') {
        const knownGroups = Object.values(groupMap).flat();
        result = result.filter(m => {
          const group = m.group.toLowerCase();
          const author = m.author.toLowerCase();
          return !knownGroups.some(k => group.includes(k) || author.includes(k));
        });
      }
    }

    // Modality filter
    if (modalityFilter !== 'all') {
      result = result.filter(m => {
        const modalities = [...m.inputModalities, ...m.outputModalities];
        return modalities.includes(modalityFilter);
      });
    }

    // Free only
    if (showFreeOnly) {
      result = result.filter(m => m.isFree);
    }

    // Reasoning only
    if (showReasoningOnly) {
      result = result.filter(m => m.supportsReasoning);
    }

    return result;
  }, [models, search, groupFilter, modalityFilter, showFreeOnly, showReasoningOnly]);

  const selectedModel = models.find(m => m.id === selectedModelId);

  const handleSelectModel = useCallback((modelId: string) => {
    localStorage.setItem('tavernstudio:selectedModel', modelId);
    addToRecentModels(modelId);
    setSelectedModelId(modelId);
    window.dispatchEvent(new Event('storage'));
  }, []);

  const handleToggleCompare = useCallback((modelId: string) => {
    setCompareModelIds(prev => {
      if (prev.includes(modelId)) {
        return prev.filter(id => id !== modelId);
      }
      // Max 4 models for comparison
      if (prev.length >= 4) return prev;
      return [...prev, modelId];
    });
  }, []);

  const compareModels = useMemo(() => 
    compareModelIds.map(id => models.find(m => m.id === id)).filter((m): m is OpenRouterModel => !!m),
    [compareModelIds, models]
  );

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Filters Bar */}
      <div className="shrink-0 border-b border-zinc-800/50 p-3 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search models..."
            className="pl-10 bg-zinc-900/50 border-zinc-800/60"
          />
        </div>

        {/* Filter chips */}
        <div className={cn('flex gap-2 flex-wrap', isMobile && 'text-xs')}>
          {/* Group filters */}
          {(['all', 'openai', 'anthropic', 'google', 'meta', 'mistral', 'other'] as const).map(g => (
            <button
              key={g}
              onClick={() => setGroupFilter(g)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-colors capitalize',
                groupFilter === g
                  ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                  : 'bg-zinc-800/50 text-zinc-400 border border-transparent hover:bg-zinc-800'
              )}
            >
              {g}
            </button>
          ))}
        </div>

        <div className={cn('flex gap-2 flex-wrap', isMobile && 'text-xs')}>
          {/* Modality filters */}
          <FilterChip
            active={modalityFilter === 'text'}
            onClick={() => setModalityFilter(modalityFilter === 'text' ? 'all' : 'text')}
            icon={<FileText className="h-3 w-3" />}
            label="Text"
          />
          <FilterChip
            active={modalityFilter === 'image'}
            onClick={() => setModalityFilter(modalityFilter === 'image' ? 'all' : 'image')}
            icon={<Image className="h-3 w-3" />}
            label="Vision"
          />
          <FilterChip
            active={modalityFilter === 'audio'}
            onClick={() => setModalityFilter(modalityFilter === 'audio' ? 'all' : 'audio')}
            icon={<Mic className="h-3 w-3" />}
            label="Audio"
          />
          <div className="w-px h-6 bg-zinc-800 mx-1" />
          <FilterChip
            active={showFreeOnly}
            onClick={() => setShowFreeOnly(!showFreeOnly)}
            icon={<DollarSign className="h-3 w-3" />}
            label="Free"
          />
          <FilterChip
            active={showReasoningOnly}
            onClick={() => setShowReasoningOnly(!showReasoningOnly)}
            icon={<Brain className="h-3 w-3" />}
            label="Reasoning"
          />
        </div>
      </div>

      {/* Results count + Compare button */}
      <div className="shrink-0 px-3 py-2 flex items-center justify-between border-b border-zinc-800/30">
        <span className="text-xs text-zinc-500">{filteredModels.length} models found</span>
        
        {compareModelIds.length > 0 && (
          <Button
            size="sm"
            onClick={() => setShowComparison(true)}
            className="h-7 gap-1.5 text-xs"
          >
            <GitCompare className="h-3.5 w-3.5" />
            Compare ({compareModelIds.length})
          </Button>
        )}
      </div>

      {/* Model List */}
      <div className="flex-1 overflow-auto p-3">
        {isLoading ? (
          <div className="text-sm text-zinc-500 py-8 text-center">Loading models...</div>
        ) : filteredModels.length === 0 ? (
          <div className="text-sm text-zinc-500 py-8 text-center">No models match your filters</div>
        ) : (
          <div className="space-y-2">
            {filteredModels.map(model => (
              <ModelCard
                key={model.id}
                model={model}
                selected={selectedModelId === model.id}
                expanded={expandedCard === model.id}
                comparing={compareModelIds.includes(model.id)}
                onSelect={() => handleSelectModel(model.id)}
                onToggleExpand={() => setExpandedCard(expandedCard === model.id ? null : model.id)}
                onToggleCompare={() => handleToggleCompare(model.id)}
                isMobile={isMobile}
              />
            ))}
          </div>
        )}
      </div>

      {/* Model Comparison Modal */}
      {showComparison && compareModels.length > 0 && (
        <ModelComparison
          models={compareModels}
          onRemoveModel={(id) => setCompareModelIds(prev => prev.filter(x => x !== id))}
          onClose={() => setShowComparison(false)}
          isMobile={isMobile}
        />
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
        active
          ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
          : 'bg-zinc-800/50 text-zinc-400 border border-transparent hover:bg-zinc-800'
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function ModelCard({
  model,
  selected,
  expanded,
  comparing,
  onSelect,
  onToggleExpand,
  onToggleCompare,
  isMobile,
}: {
  model: OpenRouterModel;
  selected: boolean;
  expanded: boolean;
  comparing: boolean;
  onSelect: () => void;
  onToggleExpand: () => void;
  onToggleCompare: () => void;
  isMobile: boolean;
}) {
  const [isPinned, setIsPinned] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      const raw = localStorage.getItem('tavernstudio:pinnedModels');
      const pinned = raw ? JSON.parse(raw) : [];
      return pinned.includes(model.id);
    } catch {
      return false;
    }
  });

  const handleTogglePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newPinned = togglePinnedModel(model.id);
    setIsPinned(newPinned);
    window.dispatchEvent(new Event('storage'));
  };

  const formatPrice = (price: number) => {
    if (price === 0) return 'Free';
    // Price is per token, convert to per 1M tokens
    const perMillion = price * 1_000_000;
    if (perMillion < 0.01) return `$${perMillion.toFixed(4)}`;
    return `$${perMillion.toFixed(2)}`;
  };

  const formatContext = (ctx: number) => {
    if (ctx >= 1_000_000) return `${(ctx / 1_000_000).toFixed(1)}M`;
    if (ctx >= 1000) return `${Math.round(ctx / 1000)}K`;
    return String(ctx);
  };

  return (
    <div
      className={cn(
        'rounded-xl border transition-all',
        selected
          ? 'border-violet-500/50 bg-violet-500/5 ring-1 ring-violet-500/20'
          : 'border-zinc-800/60 bg-zinc-900/30 hover:border-zinc-700'
      )}
    >
      {/* Main row */}
      <div 
        className="flex items-center gap-3 p-3 cursor-pointer"
        onClick={onSelect}
      >
        {/* Provider icon */}
        <div className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
          selected ? 'bg-violet-500/20 text-violet-400' : 'bg-zinc-800 text-zinc-400'
        )}>
          {model.providerIconUrl ? (
            <img src={model.providerIconUrl} alt="" className="h-5 w-5" />
          ) : (
            <Cpu className="h-5 w-5" />
          )}
        </div>

        {/* Model info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-zinc-100 truncate">
              {model.shortName || model.name}
            </span>
            
            {/* Badges */}
            {model.isFree && (
              <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
                Free
              </span>
            )}
            {model.supportsReasoning && (
              <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                <Brain className="h-3 w-3 inline" />
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
            <span>{model.author}</span>
            <span className="flex items-center gap-1">
              <Infinity className="h-3 w-3" />
              {formatContext(model.contextLength)}
            </span>
            {!model.isFree && model.pricing && (
              <span className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                {formatPrice(model.pricing.prompt)}/M in
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onToggleCompare(); }}
            className={cn(
              'p-1.5 rounded-lg transition-colors',
              comparing
                ? 'text-blue-400 bg-blue-500/10'
                : 'text-zinc-600 hover:text-zinc-400'
            )}
            title="Add to comparison"
          >
            <GitCompare className="h-4 w-4" />
          </button>
          
          <button
            onClick={handleTogglePin}
            className={cn(
              'p-1.5 rounded-lg transition-colors',
              isPinned
                ? 'text-amber-500 bg-amber-500/10'
                : 'text-zinc-600 hover:text-zinc-400'
            )}
          >
            <Star className={cn('h-4 w-4', isPinned && 'fill-amber-500')} />
          </button>

          {selected && (
            <div className="p-1.5 text-violet-400">
              <Check className="h-4 w-4" />
            </div>
          )}

          <button
            onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
            className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-zinc-800/50 p-3 space-y-3">
          {/* Description */}
          {model.description && (
            <p className="text-xs text-zinc-400 leading-relaxed">
              {model.description.slice(0, 300)}
              {model.description.length > 300 && '...'}
            </p>
          )}

          {/* Modalities */}
          <div className="flex gap-4">
            <div>
              <span className="text-[10px] uppercase text-zinc-500 block mb-1">Input</span>
              <div className="flex gap-1">
                {(model.inputModalities ?? []).map((m, i) => (
                  <ModalityBadge key={`in-${m}-${i}`} modality={m} />
                ))}
              </div>
            </div>
            <div>
              <span className="text-[10px] uppercase text-zinc-500 block mb-1">Output</span>
              <div className="flex gap-1">
                {(model.outputModalities ?? []).map((m, i) => (
                  <ModalityBadge key={`out-${m}-${i}`} modality={m} />
                ))}
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="flex gap-4">
            <div>
              <span className="text-[10px] uppercase text-zinc-500 block mb-1">Prompt</span>
              <span className="text-sm font-medium text-zinc-200">{formatPrice(model.pricing?.prompt ?? 0)}/M</span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-zinc-500 block mb-1">Completion</span>
              <span className="text-sm font-medium text-zinc-200">{formatPrice(model.pricing?.completion ?? 0)}/M</span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-zinc-500 block mb-1">Context</span>
              <span className="text-sm font-medium text-zinc-200">{formatContext(model.contextLength)}</span>
            </div>
          </div>

          {/* OpenRouter link */}
          <div className="pt-2">
            <a
              href={`https://openrouter.ai/models/${model.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-violet-400 transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              View on OpenRouter
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function ModalityBadge({ modality }: { modality: string }) {
  const icons: Record<string, React.ReactNode> = {
    text: <FileText className="h-3 w-3" />,
    image: <Image className="h-3 w-3" />,
    audio: <Mic className="h-3 w-3" />,
    video: <Sparkles className="h-3 w-3" />,
    file: <FileText className="h-3 w-3" />,
  };

  return (
    <span className="flex items-center gap-1 rounded-md bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">
      {icons[modality] || <Sparkles className="h-3 w-3" />}
      {modality}
    </span>
  );
}

