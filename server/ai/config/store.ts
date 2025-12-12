import { prepare } from '../../db';

export type ProviderConfigRow = {
  provider_id: string;
  config_json: string;
  updated_at: number;
};

export function setProviderConfig(providerId: string, config: unknown): void {
  const now = Date.now();
  const json = JSON.stringify(config);
  prepare(`
    INSERT INTO ai_provider_configs (provider_id, config_json, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(provider_id) DO UPDATE SET config_json = excluded.config_json, updated_at = excluded.updated_at
  `).run(providerId, json, now);
}

export function getProviderConfig(providerId: string): unknown | null {
  const row = prepare<ProviderConfigRow>(`
    SELECT * FROM ai_provider_configs WHERE provider_id = ?
  `).get(providerId) as ProviderConfigRow | null;

  if (!row) return null;
  try {
    return JSON.parse(row.config_json);
  } catch {
    return null;
  }
}

