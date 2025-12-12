import { prepare } from '../../db';
import { decryptSecretString, encryptSecretString } from './crypto';

export type ProviderSecretRow = {
  provider_id: string;
  auth_strategy_id: string;
  secret_key: string;
  encrypted_value: string;
  updated_at: number;
  created_at: number;
};

export function setProviderSecret(
  providerId: string,
  authStrategyId: string,
  secretKey: string,
  plaintextValue: string
): void {
  const now = Date.now();
  const encrypted = encryptSecretString(plaintextValue);

  prepare(`
    INSERT INTO ai_provider_secrets (provider_id, auth_strategy_id, secret_key, encrypted_value, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(provider_id, auth_strategy_id, secret_key)
    DO UPDATE SET encrypted_value = excluded.encrypted_value, updated_at = excluded.updated_at
  `).run(providerId, authStrategyId, secretKey, encrypted, now, now);
}

export function getProviderSecret(
  providerId: string,
  authStrategyId: string,
  secretKey: string
): string | null {
  const row = prepare<ProviderSecretRow>(`
    SELECT * FROM ai_provider_secrets
    WHERE provider_id = ? AND auth_strategy_id = ? AND secret_key = ?
  `).get(providerId, authStrategyId, secretKey) as ProviderSecretRow | null;

  if (!row) return null;
  return decryptSecretString(row.encrypted_value);
}

export function hasProviderSecret(
  providerId: string,
  authStrategyId: string,
  secretKey: string
): boolean {
  const row = prepare<{ n: number }>(`
    SELECT 1 as n FROM ai_provider_secrets
    WHERE provider_id = ? AND auth_strategy_id = ? AND secret_key = ?
    LIMIT 1
  `).get(providerId, authStrategyId, secretKey) as { n: number } | null;
  return Boolean(row);
}

export function deleteProviderSecret(providerId: string, authStrategyId: string, secretKey: string): void {
  prepare(`
    DELETE FROM ai_provider_secrets
    WHERE provider_id = ? AND auth_strategy_id = ? AND secret_key = ?
  `).run(providerId, authStrategyId, secretKey);
}

