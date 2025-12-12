import { Hono } from 'hono';
import { prepare, transaction } from '../db';
import type { MessageStyleConfig } from '../../src/types/messageStyle';
import { defaultMessageStyleConfig, applyMessageStyleDefaults } from '../../src/types/messageStyle';

export const profileRoutes = new Hono();

interface ProfileRow {
  id: string;
  name: string;
  message_style: string;
  active_ai_config_id?: string | null;
  is_default: number;
  created_at: number;
  updated_at: number;
}

interface AiConfigRow {
  id: string;
  profile_id: string;
  name: string;
  provider_id: string;
  auth_strategy_id: string;
  model_id: string;
  params_json: string;
  provider_config_json: string;
  is_default: number;
  created_at: number;
  updated_at: number;
}

interface AiConfigResponse {
  id: string;
  name: string;
  providerId: string;
  authStrategyId: string;
  modelId: string;
  params: Record<string, unknown>;
  providerConfig: Record<string, unknown>;
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
}

interface ProfileResponse {
  id: string;
  name: string;
  messageStyle: MessageStyleConfig;
  aiConfigs: AiConfigResponse[];
  activeAiConfigId: string;
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
}

interface ProfileMetaResponse {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
}

function rowToAiConfig(row: AiConfigRow): AiConfigResponse {
  let params: Record<string, unknown> = {};
  let providerConfig: Record<string, unknown> = {};
  try {
    params = JSON.parse(row.params_json) as Record<string, unknown>;
  } catch {}
  try {
    providerConfig = JSON.parse(row.provider_config_json) as Record<string, unknown>;
  } catch {}

  return {
    id: row.id,
    name: row.name,
    providerId: row.provider_id,
    authStrategyId: row.auth_strategy_id,
    modelId: row.model_id,
    params,
    providerConfig,
    isDefault: row.is_default === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getAiConfigsForProfile(profileId: string): AiConfigRow[] {
  return prepare<AiConfigRow>('SELECT * FROM profile_ai_configs WHERE profile_id = ? ORDER BY created_at ASC')
    .all(profileId) as AiConfigRow[];
}

function ensureDefaultAiConfigForProfile(profileId: string): { activeId: string } {
  const existing = prepare<AiConfigRow>('SELECT * FROM profile_ai_configs WHERE profile_id = ? ORDER BY created_at ASC')
    .all(profileId) as AiConfigRow[];

  if (existing.length > 0) {
    // Ensure one default if none set.
    const hasDefault = existing.some((r) => r.is_default === 1);
    if (!hasDefault) {
      prepare('UPDATE profile_ai_configs SET is_default = 1 WHERE id = ?').run(existing[0].id);
    }
    return { activeId: existing[0].id };
  }

  const now = Date.now();
  const id = crypto.randomUUID();
  prepare(`
    INSERT INTO profile_ai_configs
      (id, profile_id, name, provider_id, auth_strategy_id, model_id, params_json, provider_config_json, is_default, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    profileId,
    'Default AI',
    'openrouter',
    'apiKey',
    'openai/gpt-4o-mini',
    '{}',
    '{}',
    1,
    now,
    now
  );

  return { activeId: id };
}

function rowToProfile(row: ProfileRow): ProfileResponse {
  const parsed = JSON.parse(row.message_style) as Partial<MessageStyleConfig>;
  const aiRows = getAiConfigsForProfile(row.id);
  const aiConfigs = aiRows.map(rowToAiConfig);

  // Pick active AI config id
  let activeAiConfigId =
    (row.active_ai_config_id && aiConfigs.some((c) => c.id === row.active_ai_config_id) ? row.active_ai_config_id : null) ??
    aiConfigs.find((c) => c.isDefault)?.id ??
    aiConfigs[0]?.id ??
    null;

  // Backfill if missing.
  if (!activeAiConfigId) {
    const ensured = ensureDefaultAiConfigForProfile(row.id);
    activeAiConfigId = ensured.activeId;
    prepare('UPDATE profiles SET active_ai_config_id = ?, updated_at = ? WHERE id = ?').run(activeAiConfigId, Date.now(), row.id);
    const refreshed = getAiConfigsForProfile(row.id).map(rowToAiConfig);
    return {
      id: row.id,
      name: row.name,
      messageStyle: applyMessageStyleDefaults(parsed),
      aiConfigs: refreshed,
      activeAiConfigId,
      isDefault: row.is_default === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  return {
    id: row.id,
    name: row.name,
    messageStyle: applyMessageStyleDefaults(parsed),
    aiConfigs,
    activeAiConfigId,
    isDefault: row.is_default === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToProfileMeta(row: ProfileRow): ProfileMetaResponse {
  return {
    id: row.id,
    name: row.name,
    isDefault: row.is_default === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============ List all profiles ============
profileRoutes.get('/', (c) => {
  const rows = prepare<ProfileRow>('SELECT * FROM profiles ORDER BY created_at DESC').all() as ProfileRow[];
  return c.json(rows.map(rowToProfileMeta));
});

// ============ Get active/default profile ============
profileRoutes.get('/active', (c) => {
  const row = prepare<ProfileRow>('SELECT * FROM profiles WHERE is_default = 1').get() as ProfileRow | null;
  
  if (!row) {
    return c.json({ error: 'No active profile found' }, 404);
  }
  
  return c.json(rowToProfile(row));
});

// ============ Get single profile ============
profileRoutes.get('/:id', (c) => {
  const id = c.req.param('id');
  const row = prepare<ProfileRow>('SELECT * FROM profiles WHERE id = ?').get(id) as ProfileRow | null;
  
  if (!row) {
    return c.json({ error: 'Profile not found' }, 404);
  }
  
  return c.json(rowToProfile(row));
});

// ============ Create profile ============
profileRoutes.post('/', async (c) => {
  const body = await c.req.json<{
    name: string;
    messageStyle?: MessageStyleConfig;
    isDefault?: boolean;
  }>();
  
  const id = crypto.randomUUID();
  const now = Date.now();
  const messageStyle = body.messageStyle ?? defaultMessageStyleConfig;
  const isDefault = body.isDefault ?? false;
  const aiId = crypto.randomUUID();
  
  transaction(() => {
    // If setting as default, unset all others first
    if (isDefault) {
      prepare('UPDATE profiles SET is_default = 0, updated_at = ? WHERE is_default = 1').run(now);
    }
    
    prepare(`
      INSERT INTO profiles (id, name, message_style, active_ai_config_id, is_default, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, body.name, JSON.stringify(messageStyle), aiId, isDefault ? 1 : 0, now, now);

    prepare(`
      INSERT INTO profile_ai_configs
        (id, profile_id, name, provider_id, auth_strategy_id, model_id, params_json, provider_config_json, is_default, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      aiId,
      id,
      'Default AI',
      'openrouter',
      'apiKey',
      'openai/gpt-4o-mini',
      '{}',
      '{}',
      1,
      now,
      now
    );
  });
  
  return c.json({
    id,
    name: body.name,
    messageStyle,
    aiConfigs: [
      {
        id: aiId,
        name: 'Default AI',
        providerId: 'openrouter',
        authStrategyId: 'apiKey',
        modelId: 'openai/gpt-4o-mini',
        params: {},
        providerConfig: {},
        isDefault: true,
        createdAt: now,
        updatedAt: now,
      },
    ],
    activeAiConfigId: aiId,
    isDefault,
    createdAt: now,
    updatedAt: now,
  }, 201);
});

// ============ Update profile ============
profileRoutes.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<{
    name?: string;
    messageStyle?: MessageStyleConfig;
    activeAiConfigId?: string;
  }>();
  
  const existing = prepare<ProfileRow>('SELECT * FROM profiles WHERE id = ?').get(id) as ProfileRow | null;
  if (!existing) {
    return c.json({ error: 'Profile not found' }, 404);
  }
  
  const now = Date.now();
  const updates: string[] = ['updated_at = ?'];
  const values: (string | number)[] = [now];
  
  if (body.name !== undefined) {
    updates.push('name = ?');
    values.push(body.name);
  }
  
  if (body.messageStyle !== undefined) {
    updates.push('message_style = ?');
    values.push(JSON.stringify(body.messageStyle));
  }

  if (body.activeAiConfigId !== undefined) {
    // Must exist and belong to this profile.
    const exists = prepare<{ id: string }>('SELECT id FROM profile_ai_configs WHERE id = ? AND profile_id = ?')
      .get(body.activeAiConfigId, id) as { id: string } | null;
    if (!exists) {
      return c.json({ error: 'Invalid activeAiConfigId (not found for this profile)' }, 400);
    }
    updates.push('active_ai_config_id = ?');
    values.push(body.activeAiConfigId);
  }
  
  values.push(id);
  
  prepare(`UPDATE profiles SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  
  // Return updated profile
  const updated = prepare<ProfileRow>('SELECT * FROM profiles WHERE id = ?').get(id) as ProfileRow;
  return c.json(rowToProfile(updated));
});

// ============ Delete profile ============
profileRoutes.delete('/:id', (c) => {
  const id = c.req.param('id');
  
  const existing = prepare<ProfileRow>('SELECT * FROM profiles WHERE id = ?').get(id) as ProfileRow | null;
  if (!existing) {
    return c.json({ error: 'Profile not found' }, 404);
  }
  
  // Don't allow deleting the only profile
  const count = prepare<{ count: number }>('SELECT COUNT(*) as count FROM profiles').get() as { count: number };
  if (count.count <= 1) {
    return c.json({ error: 'Cannot delete the only profile' }, 400);
  }
  
  const wasDefault = existing.is_default === 1;

  transaction(() => {
    prepare('DELETE FROM profile_ai_configs WHERE profile_id = ?').run(id);
    prepare('DELETE FROM profiles WHERE id = ?').run(id);
  });
  
  // If we deleted the default, make the most recent one default
  if (wasDefault) {
    const now = Date.now();
    prepare(`
      UPDATE profiles SET is_default = 1, updated_at = ?
      WHERE id = (SELECT id FROM profiles ORDER BY updated_at DESC LIMIT 1)
    `).run(now);
  }
  
  return c.json({ success: true });
});

// ============ Activate profile (set as default) ============
profileRoutes.post('/:id/activate', (c) => {
  const id = c.req.param('id');
  
  const existing = prepare<ProfileRow>('SELECT * FROM profiles WHERE id = ?').get(id) as ProfileRow | null;
  if (!existing) {
    return c.json({ error: 'Profile not found' }, 404);
  }
  
  const now = Date.now();
  
  transaction(() => {
    // Unset all defaults
    prepare('UPDATE profiles SET is_default = 0, updated_at = ? WHERE is_default = 1').run(now);
    // Set this one as default
    prepare('UPDATE profiles SET is_default = 1, updated_at = ? WHERE id = ?').run(now, id);
  });
  
  return c.json({ success: true, updatedAt: now });
});

// ============ Seed default profile if none exists ============
export function seedDefaultProfileIfEmpty(): void {
  const count = prepare<{ count: number }>('SELECT COUNT(*) as count FROM profiles').get() as { count: number };
  
  if (count.count === 0) {
    const id = crypto.randomUUID();
    const now = Date.now();
    const aiId = crypto.randomUUID();
    
    prepare(`
      INSERT INTO profiles (id, name, message_style, active_ai_config_id, is_default, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, 'Default', JSON.stringify(defaultMessageStyleConfig), aiId, 1, now, now);

    prepare(`
      INSERT INTO profile_ai_configs
        (id, profile_id, name, provider_id, auth_strategy_id, model_id, params_json, provider_config_json, is_default, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      aiId,
      id,
      'Default AI',
      'openrouter',
      'apiKey',
      'openai/gpt-4o-mini',
      '{}',
      '{}',
      1,
      now,
      now
    );
    
    console.log('🎨 Created default profile');
    return;
  }

  // Migration safety: ensure every existing profile has at least one AI config + active id.
  const rows = prepare<ProfileRow>('SELECT * FROM profiles').all() as ProfileRow[];
  for (const row of rows) {
    const aiCount = prepare<{ c: number }>('SELECT COUNT(*) as c FROM profile_ai_configs WHERE profile_id = ?')
      .get(row.id) as { c: number };
    if (aiCount.c <= 0) {
      const ensured = ensureDefaultAiConfigForProfile(row.id);
      prepare('UPDATE profiles SET active_ai_config_id = COALESCE(active_ai_config_id, ?), updated_at = ? WHERE id = ?')
        .run(ensured.activeId, Date.now(), row.id);
    } else if (!row.active_ai_config_id) {
      const first = prepare<{ id: string }>('SELECT id FROM profile_ai_configs WHERE profile_id = ? ORDER BY created_at ASC LIMIT 1')
        .get(row.id) as { id: string } | null;
      if (first) {
        prepare('UPDATE profiles SET active_ai_config_id = ?, updated_at = ? WHERE id = ?').run(first.id, Date.now(), row.id);
      }
    }
  }
}
