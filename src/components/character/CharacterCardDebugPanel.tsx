import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';

type DebugErrorCode =
  | 'no_file'
  | 'unsupported_type'
  | 'png_bad_signature'
  | 'png_truncated'
  | 'png_no_text_chunks'
  | 'png_no_chara_keywords'
  | 'png_text_chunk_malformed'
  | 'base64_decode_failed'
  | 'json_parse_failed'
  | 'not_an_object'
  | 'missing_name';

interface DebugError {
  code: DebugErrorCode;
  message: string;
  details?: string;
}

type CardKeyword = 'chara' | 'ccv3';

interface PngTextChunk {
  keyword: string;
  text: string;
}

interface ParsedCardResult {
  kind: 'png' | 'json';
  keyword?: CardKeyword; // when parsed from PNG
  rawJson: string;
  json: Record<string, unknown>;
  name: string;
  spec?: string;
  specVersion?: string;
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function toDebugError(code: DebugErrorCode, message: string, details?: string): DebugError {
  return { code, message, details };
}

function textFromBytes(bytes: Uint8Array): string {
  // PNG tEXt chunk content is ISO-8859-1. For our use (ASCII keywords + base64 text),
  // decoding as latin1 is fine. In JS we can map each byte to codepoint 0..255.
  let out = '';
  out = String.fromCharCode(...bytes);
  return out;
}

function readUint32BE(view: DataView, offset: number): number {
  return view.getUint32(offset, false);
}

function parsePngTextChunks(bytes: Uint8Array): { chunks: PngTextChunk[]; errors: DebugError[] } {
  const errors: DebugError[] = [];
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < sig.length; i++) {
    if (bytes[i] !== sig[i]) {
      return { chunks: [], errors: [toDebugError('png_bad_signature', 'Not a PNG (bad signature).')] };
    }
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 8;
  const chunks: PngTextChunk[] = [];

  while (offset + 8 <= bytes.byteLength) {
    if (offset + 8 > bytes.byteLength) break;
    const len = readUint32BE(view, offset);
    const type = textFromBytes(bytes.subarray(offset + 4, offset + 8));
    const dataStart = offset + 8;
    const dataEnd = dataStart + len;
    const crcEnd = dataEnd + 4;

    if (crcEnd > bytes.byteLength) {
      errors.push(toDebugError('png_truncated', `PNG truncated while reading chunk ${type}.`));
      break;
    }

    if (type === 'tEXt') {
      const data = bytes.subarray(dataStart, dataEnd);
      const zeroIdx = data.indexOf(0);
      if (zeroIdx <= 0) {
        errors.push(toDebugError('png_text_chunk_malformed', 'Found a malformed tEXt chunk (missing keyword terminator).'));
      } else {
        const keyword = textFromBytes(data.subarray(0, zeroIdx));
        const text = textFromBytes(data.subarray(zeroIdx + 1));
        chunks.push({ keyword, text });
      }
    }

    offset = crcEnd;
    if (type === 'IEND') break;
  }

  if (chunks.length === 0) {
    errors.push(toDebugError('png_no_text_chunks', 'PNG contains no tEXt chunks.'));
  }

  return { chunks, errors };
}

function base64ToUtf8(base64: string): { ok: true; value: string } | { ok: false; error: DebugError } {
  try {
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i) & 0xff;
    const decoded = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    return { ok: true, value: decoded };
  } catch (e) {
    return {
      ok: false,
      error: toDebugError('base64_decode_failed', 'Failed to base64-decode PNG metadata payload.', e instanceof Error ? e.message : String(e)),
    };
  }
}

function parseJsonObject(rawJson: string): { ok: true; value: Record<string, unknown> } | { ok: false; error: DebugError } {
  try {
    const v = JSON.parse(rawJson) as unknown;
    if (!v || typeof v !== 'object' || Array.isArray(v)) {
      return { ok: false, error: toDebugError('not_an_object', 'Parsed JSON is not an object.') };
    }
    return { ok: true, value: v as Record<string, unknown> };
  } catch (e) {
    return {
      ok: false,
      error: toDebugError('json_parse_failed', 'Failed to parse JSON.', e instanceof Error ? e.message : String(e)),
    };
  }
}

function extractName(card: Record<string, unknown>): string | null {
  const data = card.data;
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const name = (data as Record<string, unknown>).name;
    if (typeof name === 'string' && name.trim()) return name.trim();
  }
  const name = card.name;
  if (typeof name === 'string' && name.trim()) return name.trim();
  return null;
}

function detectSpec(card: Record<string, unknown>): { spec?: string; specVersion?: string } {
  const spec = typeof card.spec === 'string' ? card.spec : undefined;
  const specVersion = typeof card.spec_version === 'string' ? card.spec_version : undefined;
  return { spec, specVersion };
}

function pickCardTextChunk(chunks: PngTextChunk[]): { keyword: CardKeyword; base64Text: string } | null {
  const lower = chunks.map((c) => ({ keyword: c.keyword.toLowerCase(), text: c.text }));
  const ccv3 = lower.find((c) => c.keyword === 'ccv3');
  if (ccv3) return { keyword: 'ccv3', base64Text: ccv3.text };
  const chara = lower.find((c) => c.keyword === 'chara');
  if (chara) return { keyword: 'chara', base64Text: chara.text };
  return null;
}

export function CharacterCardDebugPanel() {
  const [uiVisible, setUiVisible] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [rawTextOverride, setRawTextOverride] = useState<string>(''); // for JSON paste/edit

  const [errors, setErrors] = useState<DebugError[]>([]);
  const [parsed, setParsed] = useState<ParsedCardResult | null>(null);
  const lastObjectUrlRef = useRef<string | null>(null);

  // Toggle with: C (DEV only)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key.toLowerCase() !== 'c') return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      e.preventDefault();
      setUiVisible((v) => !v);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    // Cleanup old object URLs
    if (lastObjectUrlRef.current) URL.revokeObjectURL(lastObjectUrlRef.current);
    lastObjectUrlRef.current = null;

    if (!file) {
      setPreviewUrl(null);
      return;
    }
    if (file.type === 'image/png') {
      const url = URL.createObjectURL(file);
      lastObjectUrlRef.current = url;
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  }, [file]);

  const summary = useMemo(() => {
    if (parsed) {
      return {
        ok: true as const,
        title: parsed.name,
        subtitle: parsed.spec ? `${parsed.spec}${parsed.specVersion ? ` (${parsed.specVersion})` : ''}` : 'Unknown spec',
        source: parsed.kind === 'png' ? `PNG (${parsed.keyword ?? 'unknown'})` : 'JSON',
      };
    }
    return { ok: false as const };
  }, [parsed]);

  function reset() {
    setErrors([]);
    setParsed(null);
    setRawTextOverride('');
  }

  async function onParse() {
    reset();
    if (!file && !rawTextOverride.trim()) {
      setErrors([toDebugError('no_file', 'Select a file or paste JSON to parse.')]);
      return;
    }

    // JSON override path (paste)
    if (rawTextOverride.trim()) {
      const rawJson = rawTextOverride.trim();
      const parsedJson = parseJsonObject(rawJson);
      if (!parsedJson.ok) {
        setErrors([parsedJson.error]);
        return;
      }
      const name = extractName(parsedJson.value);
      if (!name) {
        setErrors([toDebugError('missing_name', 'JSON does not contain a valid name (expected name or data.name).')]);
        return;
      }
      const { spec, specVersion } = detectSpec(parsedJson.value);
      setParsed({ kind: 'json', rawJson, json: parsedJson.value, name, spec, specVersion });
      return;
    }

    if (!file) return;

    if (file.type !== 'image/png') {
      setErrors([toDebugError('unsupported_type', `Unsupported file type: ${file.type || '(unknown)'}. Upload a PNG or paste JSON.`)]);
      return;
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const { chunks, errors: pngErrors } = parsePngTextChunks(bytes);
    const pick = pickCardTextChunk(chunks);

    if (!pick) {
      setErrors([
        ...pngErrors.filter((e) => e.code !== 'png_no_text_chunks'),
        toDebugError(
          'png_no_chara_keywords',
          'PNG has tEXt chunks, but none with keyword "chara" or "ccv3".',
          chunks.length ? `Found keywords: ${chunks.map((c) => c.keyword).join(', ')}` : undefined
        ),
      ]);
      return;
    }

    const decoded = base64ToUtf8(pick.base64Text);
    if (!decoded.ok) {
      setErrors([...pngErrors, decoded.error]);
      return;
    }

    const parsedJson = parseJsonObject(decoded.value);
    if (!parsedJson.ok) {
      setErrors([...pngErrors, parsedJson.error]);
      return;
    }

    const name = extractName(parsedJson.value);
    if (!name) {
      setErrors([
        ...pngErrors,
        toDebugError('missing_name', 'Decoded JSON does not contain a valid name (expected name or data.name).'),
      ]);
      return;
    }

    const { spec, specVersion } = detectSpec(parsedJson.value);
    setParsed({
      kind: 'png',
      keyword: pick.keyword,
      rawJson: decoded.value,
      json: parsedJson.value,
      name,
      spec,
      specVersion,
    });
  }

  if (!uiVisible) return null;

  return (
    <div className="fixed left-4 bottom-4 z-[95] w-[520px] rounded-lg border border-zinc-700 bg-black/80 p-3 text-xs text-zinc-200 shadow-lg backdrop-blur">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-zinc-100">Character Card Debug</div>
        <div className="flex items-center gap-2">
          <div className="text-[10px] text-zinc-400">[C] toggle</div>
          <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px]" onClick={() => setUiVisible(false)}>
            Hide
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <Label className="text-[11px] text-zinc-300">Upload PNG</Label>
          <Input
            className="mt-1 h-8 text-xs"
            type="file"
            accept="image/png,application/json"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setFile(f);
              reset();
            }}
          />
          <div className="mt-1 text-[10px] text-zinc-500">PNG: reads tEXt keywords (ccv3/chara). JSON: paste below.</div>
        </div>

        <div>
          <Label className="text-[11px] text-zinc-300">Or paste JSON</Label>
          <textarea
            className="mt-1 min-h-20 w-full resize-y rounded-md border border-zinc-700 bg-zinc-950/60 p-2 font-mono text-[11px] text-zinc-200 outline-none focus:border-zinc-500"
            value={rawTextOverride}
            onChange={(e) => setRawTextOverride(e.target.value)}
            placeholder='Paste a Tavern/Silly card JSON here (v1 or v2). Example: {"spec":"chara_card_v2","spec_version":"2.0","data":{...}}'
            spellCheck={false}
          />
        </div>

        <div className="flex gap-2">
          <Button size="sm" variant="secondary" className="flex-1" onClick={() => void onParse()}>
            Parse
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => {
              setFile(null);
              reset();
            }}
          >
            Clear
          </Button>
        </div>

        {previewUrl ? (
          <div className="rounded-md border border-zinc-800 bg-zinc-950/40 p-2">
            <div className="mb-2 text-[11px] text-zinc-300">PNG preview</div>
            <img src={previewUrl} alt="Uploaded PNG preview" className="max-h-40 w-auto rounded border border-zinc-800" />
          </div>
        ) : null}

        {summary.ok ? (
          <div className="rounded-md border border-emerald-800/60 bg-emerald-950/20 p-2">
            <div className="text-xs font-semibold text-emerald-200">{summary.title}</div>
            <div className="mt-1 text-[10px] text-emerald-300/80">
              {summary.subtitle} • {summary.source}
            </div>
          </div>
        ) : null}

        {errors.length ? (
          <div className="rounded-md border border-red-900/60 bg-red-950/20 p-2">
            <div className="text-xs font-semibold text-red-200">Not a valid character card</div>
            <ul className="mt-2 space-y-2">
              {errors.map((e, i) => (
                <li key={`${e.code}-${i}`} className="text-[11px] text-red-100">
                  <div className="font-mono text-[10px] text-red-300">{e.code}</div>
                  <div>{e.message}</div>
                  {e.details ? <div className="mt-1 text-[10px] text-red-300/80">{e.details}</div> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {parsed ? (
          <div className="rounded-md border border-zinc-800 bg-zinc-950/40 p-2">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs font-semibold text-zinc-100">Parsed fields</div>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-[10px]"
                onClick={() => {
                  setRawTextOverride(parsed.rawJson);
                }}
              >
                Copy JSON to editor
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <div className="text-[10px] text-zinc-400">name</div>
                <div className="text-xs text-zinc-100">{parsed.name}</div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-400">spec</div>
                <div className="text-xs text-zinc-100">{parsed.spec ?? '(none)'}</div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-400">spec_version</div>
                <div className="text-xs text-zinc-100">{parsed.specVersion ?? '(none)'}</div>
              </div>
              <div className="col-span-2">
                <div className="text-[10px] text-zinc-400">data</div>
                <pre className="mt-1 max-h-44 overflow-auto rounded border border-zinc-800 bg-black/30 p-2 text-[10px] leading-snug text-zinc-200">
                  {safeStringify((parsed.json as any).data ?? parsed.json)}
                </pre>
              </div>
              <div className="col-span-2">
                <div className="text-[10px] text-zinc-400">full JSON</div>
                <pre className="mt-1 max-h-44 overflow-auto rounded border border-zinc-800 bg-black/30 p-2 text-[10px] leading-snug text-zinc-200">
                  {safeStringify(parsed.json)}
                </pre>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}




