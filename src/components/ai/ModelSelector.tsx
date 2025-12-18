import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Brain, Image, Mic, Video, FileText, Sparkles, ChevronDown, X, Check } from 'lucide-react';
import { openRouterModels, type OpenRouterModel } from '../../api/client';
import { queryKeys } from '../../lib/queryClient';
import { cn } from '../../lib/utils';
import { Input } from '../ui/input';

interface ModelSelectorProps {
  value: string | null;
  onChange: (modelSlug: string) => void;
  className?: string;
}

// Format context length for display
function formatContextLength(length: number): string {
  if (length >= 1000000) {
    return `${(length / 1000000).toFixed(1)}M`;
  }
  if (length >= 1000) {
    return `${Math.round(length / 1000)}K`;
  }
  return String(length);
}

// Format pricing for display (price per 1M tokens)
function formatPrice(priceStr: string): string {
  const price = parseFloat(priceStr);
  if (price === 0) return 'Free';
  if (price < 0.0001) return '<$0.01';
  return `$${(price * 1000000).toFixed(2)}`;
}

// Get modality icon
function ModalityIcon({ modality, className }: { modality: string; className?: string }) {
  switch (modality.toLowerCase()) {
    case 'image':
      return <Image className={className} />;
    case 'audio':
      return <Mic className={className} />;
    case 'video':
      return <Video className={className} />;
    case 'file':
      return <FileText className={className} />;
    default:
      return null;
  }
}

// Group colors for visual distinction
const groupColors: Record<string, string> = {
  'OpenAI': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'Anthropic': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'Google': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Gemini': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Meta': 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  'Mistral': 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  'DeepSeek': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  'Qwen': 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  'Other': 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
};

function getGroupColor(group: string): string {
  return groupColors[group] || groupColors['Other'];
}

export function ModelSelector({ value, onChange, className }: ModelSelectorProps) {
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filterFree, setFilterFree] = useState(false);
  const [filterReasoning, setFilterReasoning] = useState(false);
  const [filterMultimodal, setFilterMultimodal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.openRouterModels.list(),
    queryFn: () => openRouterModels.list(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const models = data?.models ?? [];

  // Get unique groups for filtering
  const groups = useMemo(() => {
    const groupSet = new Set(models.map(m => m.group));
    return Array.from(groupSet).sort();
  }, [models]);

  // Filter and sort models
  const filteredModels = useMemo(() => {
    let result = models;

    // Text search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(m =>
        m.name.toLowerCase().includes(q) ||
        m.slug.toLowerCase().includes(q) ||
        m.author.toLowerCase().includes(q) ||
        m.group.toLowerCase().includes(q)
      );
    }

    // Group filter
    if (selectedGroup) {
      result = result.filter(m => m.group === selectedGroup);
    }

    // Feature filters
    if (filterFree) {
      result = result.filter(m => m.endpoint?.is_free);
    }
    if (filterReasoning) {
      result = result.filter(m => m.supports_reasoning);
    }
    if (filterMultimodal) {
      result = result.filter(m => m.input_modalities.length > 1);
    }

    // Sort: selected first, then by name
    result.sort((a, b) => {
      if (a.slug === value) return -1;
      if (b.slug === value) return 1;
      return a.name.localeCompare(b.name);
    });

    return result;
  }, [models, search, selectedGroup, filterFree, filterReasoning, filterMultimodal, value]);

  const selectedModel = models.find(m => m.slug === value);

  const handleSelect = useCallback((model: OpenRouterModel) => {
    onChange(model.slug);
  }, [onChange]);

  const activeFilterCount = [filterFree, filterReasoning, filterMultimodal, selectedGroup].filter(Boolean).length;

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Search and filters */}
      <div className="space-y-2 mb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search models..."
            className="pl-9 bg-zinc-900/50 border-zinc-800/60"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter toggles */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-colors',
              showFilters || activeFilterCount > 0
                ? 'border-violet-500/50 bg-violet-500/10 text-violet-300'
                : 'border-zinc-800 text-zinc-400 hover:border-zinc-700'
            )}
          >
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', showFilters && 'rotate-180')} />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-1 rounded-full bg-violet-500/30 px-1.5 text-[10px]">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Quick group filters */}
          {groups.slice(0, 5).map(group => (
            <button
              key={group}
              onClick={() => setSelectedGroup(selectedGroup === group ? null : group)}
              className={cn(
                'rounded-lg border px-3 py-1.5 text-xs transition-colors',
                selectedGroup === group
                  ? getGroupColor(group)
                  : 'border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-400'
              )}
            >
              {group}
            </button>
          ))}
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div className="flex flex-wrap gap-2 pt-1">
            <FilterChip
              active={filterFree}
              onClick={() => setFilterFree(!filterFree)}
              icon={<Sparkles className="h-3 w-3" />}
              label="Free"
            />
            <FilterChip
              active={filterReasoning}
              onClick={() => setFilterReasoning(!filterReasoning)}
              icon={<Brain className="h-3 w-3" />}
              label="Reasoning"
            />
            <FilterChip
              active={filterMultimodal}
              onClick={() => setFilterMultimodal(!filterMultimodal)}
              icon={<Image className="h-3 w-3" />}
              label="Multimodal"
            />
          </div>
        )}
      </div>

      {/* Selected model display */}
      {selectedModel && (
        <div className="mb-3 rounded-xl border border-violet-500/30 bg-violet-500/5 p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className={cn('rounded-md border px-2 py-0.5 text-[10px] font-medium', getGroupColor(selectedModel.group))}>
                  {selectedModel.group}
                </span>
                <span className="text-sm font-medium text-zinc-100 truncate">{selectedModel.short_name}</span>
              </div>
              <div className="mt-1 text-xs text-zinc-500 font-mono">{selectedModel.slug}</div>
            </div>
            <Check className="h-5 w-5 text-violet-400 shrink-0" />
          </div>
        </div>
      )}

      {/* Model list */}
      <div className="flex-1 overflow-auto max-h-[400px] space-y-1.5 pr-1">
        {isLoading ? (
          <div className="py-8 text-center text-sm text-zinc-500">Loading models...</div>
        ) : filteredModels.length === 0 ? (
          <div className="py-8 text-center text-sm text-zinc-500">
            No models match your search
          </div>
        ) : (
          filteredModels.map(model => (
            <ModelCard
              key={model.slug}
              model={model}
              selected={model.slug === value}
              onSelect={() => handleSelect(model)}
            />
          ))
        )}
      </div>

      {/* Stats */}
      {!isLoading && (
        <div className="mt-2 pt-2 border-t border-zinc-800/50 text-xs text-zinc-500">
          {filteredModels.length} of {models.length} models
          {data?.cached && <span className="ml-2 text-zinc-600">(cached)</span>}
        </div>
      )}
    </div>
  );
}

// Filter chip component
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
        'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-colors',
        active
          ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
          : 'border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-400'
      )}
    >
      {icon}
      {label}
    </button>
  );
}

// Model card component
function ModelCard({
  model,
  selected,
  onSelect,
}: {
  model: OpenRouterModel;
  selected: boolean;
  onSelect: () => void;
}) {
  const isFree = model.endpoint?.is_free;
  const hasMultimodal = model.input_modalities.length > 1;

  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full rounded-xl border p-3 text-left transition-all',
        selected
          ? 'border-violet-500/50 bg-violet-500/10 ring-1 ring-violet-500/20'
          : 'border-zinc-800/60 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-900/50'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {/* Header row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('rounded-md border px-2 py-0.5 text-[10px] font-medium shrink-0', getGroupColor(model.group))}>
              {model.group}
            </span>
            <span className="text-sm font-medium text-zinc-200 truncate">{model.short_name}</span>
            {isFree && (
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-400 shrink-0">
                Free
              </span>
            )}
            {model.supports_reasoning && (
              <Brain className="h-3.5 w-3.5 text-violet-400 shrink-0" title="Supports reasoning" />
            )}
          </div>

          {/* Metadata row */}
          <div className="mt-1.5 flex items-center gap-3 text-[11px] text-zinc-500">
            <span className="font-mono">{formatContextLength(model.context_length)} ctx</span>
            
            {model.endpoint?.pricing && (
              <span>
                {formatPrice(model.endpoint.pricing.prompt)}/M in
              </span>
            )}

            {hasMultimodal && (
              <div className="flex items-center gap-1">
                {model.input_modalities.filter(m => m !== 'text').map(mod => (
                  <ModalityIcon key={mod} modality={mod} className="h-3 w-3" />
                ))}
              </div>
            )}
          </div>
        </div>

        {selected && <Check className="h-4 w-4 text-violet-400 shrink-0 mt-0.5" />}
      </div>
    </button>
  );
}

