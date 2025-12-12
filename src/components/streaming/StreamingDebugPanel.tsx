import { STREAMING_DEBUG_SCENARIOS, useStreamingDebug } from '../../hooks/useStreamingDebug';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

/**
 * Streaming debug panel (DEV-only).
 *
 * Keyboard shortcuts:
 * - S: Start/restart streaming
 * - 1/2/3: Switch scenario
 * - Enter: Finalize and persist
 * - Escape: Cancel
 */
export function StreamingDebugPanel() {
  const debug = useStreamingDebug();

  // Keep hook mounted for keyboard shortcuts, but hide UI until first Start ('s').
  if (!debug.uiVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[360px] rounded-lg border border-zinc-700 bg-black/80 p-3 text-xs text-zinc-200 shadow-lg backdrop-blur">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-zinc-100">Streaming Debug</div>
        <div className="flex items-center gap-2">
          <div className="text-[10px] text-zinc-400">[S] start • [Enter] finalize • [Esc] cancel</div>
          <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px]" onClick={debug.hideUi}>
            Hide
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <Label className="text-[11px] text-zinc-300">Scenario</Label>
          <Select
            value={debug.scenarioId}
            onValueChange={(v) => debug.setScenarioId(v as (typeof STREAMING_DEBUG_SCENARIOS)[number]['id'])}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select scenario…" />
            </SelectTrigger>
            <SelectContent>
              {STREAMING_DEBUG_SCENARIOS.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="mt-1 text-[10px] text-zinc-400">Hotkeys: [1] markdown • [2] long RP • [3] other RP</div>
        </div>

        <div>
          <Label className="text-[11px] text-zinc-300">Chunking</Label>
          <Select value={debug.chunkMode} onValueChange={(v) => debug.setChunkMode(v as typeof debug.chunkMode)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="characters">Characters</SelectItem>
              <SelectItem value="openai_tokens">OpenAI tokens (tiktoken)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-[11px] text-zinc-300">Delay (ms)</Label>
          <Input
            className="h-8 text-xs"
            type="number"
            min={0}
            value={debug.delayMs}
            onChange={(e) => debug.setDelayMs(Number(e.target.value))}
          />
        </div>

        {debug.chunkMode === 'characters' ? (
          <div>
            <Label className="text-[11px] text-zinc-300">Chars/chunk</Label>
            <Input
              className="h-8 text-xs"
              type="number"
              min={1}
              value={debug.charsPerChunk}
              onChange={(e) => debug.setCharsPerChunk(Number(e.target.value))}
            />
          </div>
        ) : (
          <>
            <div>
              <Label className="text-[11px] text-zinc-300">Encoding</Label>
              <Select
                value={debug.openAIEncoding}
                onValueChange={(v) => debug.setOpenAIEncoding(v as typeof debug.openAIEncoding)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cl100k_base">cl100k_base (gpt-4/3.5)</SelectItem>
                  <SelectItem value="o200k_base">o200k_base (gpt-4o)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px] text-zinc-300">Tokens/chunk</Label>
              <Input
                className="h-8 text-xs"
                type="number"
                min={1}
                value={debug.tokensPerChunk}
                onChange={(e) => debug.setTokensPerChunk(Number(e.target.value))}
              />
            </div>
          </>
        )}

        <div className="col-span-2 mt-1 flex gap-2">
          <Button size="sm" variant="secondary" className="flex-1" onClick={() => void debug.start()}>
            {debug.isFeeding ? 'Restart' : 'Start'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            disabled={!debug.isStreaming}
            onClick={() => void debug.finalize()}
          >
            Finalize
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="flex-1"
            disabled={!debug.isStreaming}
            onClick={debug.cancel}
          >
            Cancel
          </Button>
        </div>

        <div className="col-span-2 mt-1 text-[11px] text-zinc-400">
          {debug.isStreaming ? (
            <span>
              {debug.isFeeding ? 'Feeding' : 'Streaming'} • {debug.progressIndex}/{debug.progressTotal} {debug.progressUnit}
            </span>
          ) : (
            <span>Idle • Press [S] or click Start</span>
          )}
          {debug.tokenizationError ? (
            <div className="mt-1 text-[10px] text-amber-400">
              Tokenization failed (fell back to characters): {debug.tokenizationError}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

