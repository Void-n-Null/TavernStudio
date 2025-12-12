import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { join } from 'node:path';

type EncryptedBlobV1 = {
  v: 1;
  alg: 'aes-256-gcm';
  iv_b64: string;
  tag_b64: string;
  ct_b64: string;
};

function getDataDir(): string {
  // server/db/index.ts uses PROJECT_ROOT/data; mirror that convention.
  return join(process.cwd(), 'data');
}

function loadOrCreateMasterKey(): Buffer {
  const env = process.env.TAVERN_MASTER_KEY_B64;
  if (env && env.trim()) {
    const key = Buffer.from(env.trim(), 'base64');
    if (key.length !== 32) throw new Error('TAVERN_MASTER_KEY_B64 must be 32 bytes (base64-encoded)');
    return key;
  }

  // Local-dev friendly fallback: store a generated key in ./data/master.key
  // (data/ is gitignored). This is still "encryption at rest" but not centrally managed.
  const dataDir = getDataDir();
  const keyPath = join(dataDir, 'master.key');
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

  if (existsSync(keyPath)) {
    const raw = readFileSync(keyPath, 'utf8').trim();
    const key = Buffer.from(raw, 'base64');
    if (key.length !== 32) throw new Error('Invalid data/master.key (expected 32-byte base64 key)');
    return key;
  }

  const key = randomBytes(32);
  writeFileSync(keyPath, key.toString('base64'), { encoding: 'utf8' });
  // Best-effort permissions hardening.
  try {
    chmodSync(keyPath, 0o600);
  } catch {}
  return key;
}

let cachedKey: Buffer | null = null;
function getMasterKey(): Buffer {
  if (!cachedKey) cachedKey = loadOrCreateMasterKey();
  return cachedKey;
}

export function encryptSecretString(plaintext: string): string {
  const key = getMasterKey();
  const iv = randomBytes(12); // recommended IV size for GCM
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  const blob: EncryptedBlobV1 = {
    v: 1,
    alg: 'aes-256-gcm',
    iv_b64: iv.toString('base64'),
    tag_b64: tag.toString('base64'),
    ct_b64: ct.toString('base64'),
  };

  return JSON.stringify(blob);
}

export function decryptSecretString(blobStr: string): string {
  const key = getMasterKey();
  const blob = JSON.parse(blobStr) as EncryptedBlobV1;
  if (!blob || blob.v !== 1 || blob.alg !== 'aes-256-gcm') throw new Error('Unsupported secret blob format');

  const iv = Buffer.from(blob.iv_b64, 'base64');
  const tag = Buffer.from(blob.tag_b64, 'base64');
  const ct = Buffer.from(blob.ct_b64, 'base64');

  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString('utf8');
}

