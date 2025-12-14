export type CardPngKeyword = 'chara' | 'ccv3';

export type ExtractCardFromPngResult =
  | { ok: true; keyword: CardPngKeyword; rawJson: string; json: Record<string, unknown> }
  | { ok: false; error: string };

function textFromBytesLatin1(bytes: Uint8Array): string {
  // PNG tEXt chunk content is ISO-8859-1.
  // For our use (ASCII keywords + base64 payload), mapping bytes -> codepoints is fine.
  return String.fromCharCode(...bytes);
}

function readUint32BE(view: DataView, offset: number): number {
  return view.getUint32(offset, false);
}

function parsePngTextChunks(bytes: Uint8Array): Array<{ keyword: string; text: string }> {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < sig.length; i++) {
    if (bytes[i] !== sig[i]) throw new Error('Not a PNG (bad signature).');
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 8;
  const chunks: Array<{ keyword: string; text: string }> = [];

  while (offset + 8 <= bytes.byteLength) {
    const len = readUint32BE(view, offset);
    const type = textFromBytesLatin1(bytes.subarray(offset + 4, offset + 8));
    const dataStart = offset + 8;
    const dataEnd = dataStart + len;
    const crcEnd = dataEnd + 4;

    if (crcEnd > bytes.byteLength) throw new Error(`PNG truncated while reading chunk ${type}.`);

    if (type === 'tEXt') {
      const data = bytes.subarray(dataStart, dataEnd);
      const zeroIdx = data.indexOf(0);
      if (zeroIdx > 0) {
        const keyword = textFromBytesLatin1(data.subarray(0, zeroIdx));
        const text = textFromBytesLatin1(data.subarray(zeroIdx + 1));
        chunks.push({ keyword, text });
      }
    }

    offset = crcEnd;
    if (type === 'IEND') break;
  }

  return chunks;
}

function pickCardTextChunk(
  chunks: Array<{ keyword: string; text: string }>,
): { keyword: CardPngKeyword; base64Text: string } | null {
  const lower = chunks.map((c) => ({ keyword: c.keyword.toLowerCase(), text: c.text }));
  const ccv3 = lower.find((c) => c.keyword === 'ccv3');
  if (ccv3) return { keyword: 'ccv3', base64Text: ccv3.text };
  const chara = lower.find((c) => c.keyword === 'chara');
  if (chara) return { keyword: 'chara', base64Text: chara.text };
  return null;
}

function base64ToUtf8(base64: string): string {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i) & 0xff;
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
}

export async function extractCardFromPngFile(file: File): Promise<ExtractCardFromPngResult> {
  try {
    if (!file) return { ok: false, error: 'No file provided.' };
    if (file.type && file.type !== 'image/png') return { ok: false, error: `Unsupported file type: ${file.type}` };
    const bytes = new Uint8Array(await file.arrayBuffer());
    const textChunks = parsePngTextChunks(bytes);
    const picked = pickCardTextChunk(textChunks);
    if (!picked) return { ok: false, error: 'No card metadata found (expected tEXt keyword "ccv3" or "chara").' };

    const rawJson = base64ToUtf8(picked.base64Text);
    const json = JSON.parse(rawJson) as unknown;
    if (!json || typeof json !== 'object' || Array.isArray(json)) {
      return { ok: false, error: 'PNG metadata JSON is not an object.' };
    }

    return { ok: true, keyword: picked.keyword, rawJson, json: json as Record<string, unknown> };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}



