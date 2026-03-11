import type {
  HistoryEntry,
  LinkedDevice,
  PairingCodeState,
  PresetAction,
  Presets,
  Profile,
  QueuedMutation,
  Reward,
  SharedFamilySnapshot,
} from '../../../src/types/app'
import type { AuthDevice, WorkerEnv } from './auth'
import { generatePairCode, normalizePairCode } from './pairing'
import { uploadPhotoDataUrl, readPhotoDataUrl } from './uploads'
import { sha256 } from './auth'

const nowIso = () => new Date().toISOString()

export const createFamilyWithSnapshot = async (
  env: WorkerEnv,
  input: {
    deviceId: string
    deviceTokenHash: string
    deviceTokenPlain: string
    deviceName: string
    familyId: string
    parentName: string
    snapshot: SharedFamilySnapshot | {
      history: HistoryEntry[]
      presets: Presets
      profile: Profile
      rewards: Reward[]
      totalPoints: number
    }
  },
) => {
  const createdAt = nowIso()
  const photoKey = await uploadPhotoDataUrl(
    env,
    input.familyId,
    input.snapshot.profile.photoDataUrl,
  )

  await env.DB.batch([
    env.DB.prepare(
      'INSERT INTO families (id, created_at, updated_at, revision, active) VALUES (?1, ?2, ?2, 1, 1)',
    ).bind(input.familyId, createdAt),
    env.DB.prepare(
      `INSERT INTO devices (
        id, family_id, parent_name, device_name, device_token_hash, is_primary, created_at, last_seen_at, revoked_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6, ?6, NULL)`,
    ).bind(
      input.deviceId,
      input.familyId,
      input.parentName,
      input.deviceName,
      input.deviceTokenHash,
      createdAt,
    ),
    env.DB.prepare(
      `INSERT INTO profiles (
        family_id, child_name, photo_key, updated_at, updated_by_device_id
      ) VALUES (?1, ?2, ?3, ?4, ?5)`,
    ).bind(
      input.familyId,
      input.snapshot.profile.childName,
      photoKey,
      input.snapshot.profile.updatedAt || createdAt,
      input.deviceId,
    ),
  ])

  await replacePresets(env, input.familyId, input.deviceId, input.snapshot.presets)
  await replaceRewards(env, input.familyId, input.deviceId, input.snapshot.rewards)

  for (const event of input.snapshot.history) {
    await insertPointEvent(env, input.familyId, event)
  }

  const pairingCode = await createPairingCode(env, {
    deviceId: input.deviceId,
    familyId: input.familyId,
  })
  const snapshot = await buildFamilySnapshot(env, input.familyId)

  return {
    deviceId: input.deviceId,
    deviceToken: input.deviceTokenPlain,
    snapshot: {
      ...snapshot,
      activePairingCode: pairingCode,
    },
  }
}

export const createPairingCode = async (
  env: WorkerEnv,
  auth: Pick<AuthDevice, 'deviceId' | 'familyId'>,
) => {
  const createdAt = nowIso()
  const expiresAt = new Date(
    Date.now() + Number.parseInt(env.PAIR_CODE_TTL_MINUTES ?? '20', 10) * 60_000,
  ).toISOString()
  const code = generatePairCode()
  const codeHash = await sha256(normalizePairCode(code))

  await env.DB.batch([
    env.DB.prepare(
      'UPDATE pairing_codes SET redeemed_at = ?1 WHERE family_id = ?2 AND redeemed_at IS NULL',
    ).bind(createdAt, auth.familyId),
    env.DB.prepare(
      `INSERT INTO pairing_codes (
        id, family_id, code_hash, expires_at, redeemed_at, created_at, created_by_device_id
      ) VALUES (?1, ?2, ?3, ?4, NULL, ?5, ?6)`,
    ).bind(crypto.randomUUID(), auth.familyId, codeHash, expiresAt, createdAt, auth.deviceId),
  ])

  return {
    code,
    createdAt,
    expiresAt,
  } satisfies PairingCodeState
}

export const redeemPairingCode = async (
  env: WorkerEnv,
  input: {
    code: string
    deviceId: string
    deviceName: string
    deviceTokenHash: string
    deviceTokenPlain: string
    parentName: string
  },
) => {
  const codeHash = await sha256(normalizePairCode(input.code))
  const redeemedAt = nowIso()
  const pairingCode = await env.DB.prepare(
    `SELECT id, family_id
     FROM pairing_codes
     WHERE code_hash = ?1 AND redeemed_at IS NULL AND expires_at > ?2
     LIMIT 1`,
  )
    .bind(codeHash, redeemedAt)
    .first<{ family_id: string; id: string }>()

  if (!pairingCode) {
    throw new Error('That sync code is invalid, expired, or already used.')
  }

  await env.DB.batch([
    env.DB.prepare(
      'UPDATE pairing_codes SET redeemed_at = ?1 WHERE id = ?2',
    ).bind(redeemedAt, pairingCode.id),
    env.DB.prepare(
      `INSERT INTO devices (
        id, family_id, parent_name, device_name, device_token_hash, is_primary, created_at, last_seen_at, revoked_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6, ?6, NULL)`,
    ).bind(
      input.deviceId,
      pairingCode.family_id,
      input.parentName,
      input.deviceName,
      input.deviceTokenHash,
      redeemedAt,
    ),
    env.DB.prepare(
      'UPDATE families SET revision = revision + 1, updated_at = ?1 WHERE id = ?2',
    ).bind(redeemedAt, pairingCode.family_id),
  ])

  return {
    deviceId: input.deviceId,
    deviceToken: input.deviceTokenPlain,
    snapshot: await buildFamilySnapshot(env, pairingCode.family_id),
  }
}

export const pushMutations = async (
  env: WorkerEnv,
  auth: AuthDevice,
  mutations: QueuedMutation[],
) => {
  const acceptedMutationIds: string[] = []
  let changed = false

  for (const mutation of mutations) {
    if (mutation.kind === 'point-event') {
      const inserted = await insertPointEvent(env, auth.familyId, mutation.payload.event)

      if (inserted) {
        acceptedMutationIds.push(mutation.id)
        changed = true
      } else {
        acceptedMutationIds.push(mutation.id)
      }

      continue
    }

    if (mutation.kind === 'profile') {
      await upsertProfile(env, auth.familyId, auth.deviceId, mutation.payload.profile)
      acceptedMutationIds.push(mutation.id)
      changed = true
      continue
    }

    if (mutation.kind === 'presets') {
      await replacePresets(env, auth.familyId, auth.deviceId, mutation.payload.presets)
      acceptedMutationIds.push(mutation.id)
      changed = true
      continue
    }

    await replaceRewards(env, auth.familyId, auth.deviceId, mutation.payload.rewards)
    acceptedMutationIds.push(mutation.id)
    changed = true
  }

  if (changed) {
    await env.DB.prepare(
      'UPDATE families SET revision = revision + 1, updated_at = ?1 WHERE id = ?2',
    )
      .bind(nowIso(), auth.familyId)
      .run()
  }

  const family = await env.DB.prepare(
    'SELECT revision FROM families WHERE id = ?1 LIMIT 1',
  )
    .bind(auth.familyId)
    .first<{ revision: number }>()

  return {
    acceptedMutationIds,
    cursor: family?.revision ?? 0,
  }
}

export const pullSnapshot = async (
  env: WorkerEnv,
  auth: AuthDevice,
  since: number,
) => {
  const family = await env.DB.prepare(
    'SELECT revision FROM families WHERE id = ?1 LIMIT 1',
  )
    .bind(auth.familyId)
    .first<{ revision: number }>()

  const cursor = family?.revision ?? 0

  if (since >= cursor) {
    return {
      changed: false,
      snapshot: null,
    }
  }

  return {
    changed: true,
    snapshot: await buildFamilySnapshot(env, auth.familyId),
  }
}

export const listDevices = async (env: WorkerEnv, familyId: string) => {
  const rows = await env.DB.prepare(
    `SELECT id, parent_name, device_name, is_primary, created_at, last_seen_at, revoked_at
     FROM devices
     WHERE family_id = ?1
     ORDER BY created_at ASC`,
  )
    .bind(familyId)
    .all<{
      created_at: string
      device_name: string
      id: string
      is_primary: number
      last_seen_at: string | null
      parent_name: string
      revoked_at: string | null
    }>()

  return rows.results.map(mapDevice)
}

export const revokeDevice = async (
  env: WorkerEnv,
  auth: AuthDevice,
  deviceId: string,
) => {
  if (deviceId === auth.deviceId) {
    throw new Error('Use another linked device to revoke this one.')
  }

  await env.DB.batch([
    env.DB.prepare(
      'UPDATE devices SET revoked_at = ?1 WHERE family_id = ?2 AND id = ?3',
    ).bind(nowIso(), auth.familyId, deviceId),
    env.DB.prepare(
      'UPDATE families SET revision = revision + 1, updated_at = ?1 WHERE id = ?2',
    ).bind(nowIso(), auth.familyId),
  ])

  return listDevices(env, auth.familyId)
}

export const buildFamilySnapshot = async (
  env: WorkerEnv,
  familyId: string,
): Promise<SharedFamilySnapshot> => {
  const family = await env.DB.prepare(
    'SELECT revision FROM families WHERE id = ?1 LIMIT 1',
  )
    .bind(familyId)
    .first<{ revision: number }>()
  const profileRow = await env.DB.prepare(
    'SELECT child_name, photo_key, updated_at, updated_by_device_id FROM profiles WHERE family_id = ?1 LIMIT 1',
  )
    .bind(familyId)
    .first<{
      child_name: string
      photo_key: string | null
      updated_at: string
      updated_by_device_id: string | null
    }>()

  const presetRows = await env.DB.prepare(
    `SELECT id, type, label, points, icon, visible_on_home, sort_order, source, deleted_at, updated_at, updated_by_device_id
     FROM presets
     WHERE family_id = ?1`,
  )
    .bind(familyId)
    .all<{
      deleted_at: string | null
      icon: string | null
      id: string
      label: string
      points: number
      sort_order: number
      source: string
      type: 'add' | 'remove'
      updated_at: string
      updated_by_device_id: string | null
      visible_on_home: number
    }>()

  const rewardRows = await env.DB.prepare(
    `SELECT id, title, description, points_required, claimed, claimed_at, sort_order, deleted_at, updated_at, updated_by_device_id
     FROM rewards
     WHERE family_id = ?1`,
  )
    .bind(familyId)
    .all<{
      claimed: number
      claimed_at: string | null
      deleted_at: string | null
      description: string
      id: string
      points_required: number
      sort_order: number
      title: string
      updated_at: string
      updated_by_device_id: string | null
    }>()

  const eventRows = await env.DB.prepare(
    `SELECT id, device_id, parent_name, delta, label, reason, created_at_client, received_at_server
     FROM point_events
     WHERE family_id = ?1
     ORDER BY created_at_client DESC`,
  )
    .bind(familyId)
    .all<{
      created_at_client: string
      delta: number
      device_id: string
      id: string
      label: string | null
      parent_name: string
      reason: string
      received_at_server: string
    }>()

  const activePairRow = await env.DB.prepare(
    `SELECT created_at, expires_at
     FROM pairing_codes
     WHERE family_id = ?1 AND redeemed_at IS NULL AND expires_at > ?2
     ORDER BY created_at DESC
     LIMIT 1`,
  )
    .bind(familyId, nowIso())
    .first<{ created_at: string; expires_at: string }>()

  const linkedDevices = await listDevices(env, familyId)

  const presets: Presets = {
    add: presetRows.results
      .filter((preset) => preset.type === 'add')
      .map(mapPreset),
    remove: presetRows.results
      .filter((preset) => preset.type === 'remove')
      .map(mapPreset),
  }

  const rewards = rewardRows.results.map((reward) => ({
    claimedAt: reward.claimed_at,
    deletedAt: reward.deleted_at,
    description: reward.description,
    id: reward.id,
    isClaimed: reward.claimed === 1,
    milestone: reward.points_required,
    sortOrder: reward.sort_order,
    title: reward.title,
    updatedAt: reward.updated_at,
    updatedByDeviceId: reward.updated_by_device_id,
  }))

  const history = eventRows.results.map((event) => {
    const type: 'add' | 'remove' = event.delta >= 0 ? 'add' : 'remove'

    return {
      actorName: event.parent_name,
      createdLocallyAt: event.created_at_client,
      deviceId: event.device_id,
      id: event.id,
      points: Math.abs(event.delta),
      reason: event.reason || event.label || 'Bestie Points',
      syncedAt: event.received_at_server,
      syncStatus: 'synced' as const,
      timestamp: event.created_at_client,
      type,
    }
  })

  return {
    activePairingCode: activePairRow
      ? {
          code: 'ACTIVE',
          createdAt: activePairRow.created_at,
          expiresAt: activePairRow.expires_at,
        }
      : null,
    cursor: family?.revision ?? 0,
    devices: linkedDevices,
    familyId,
    history,
    presets,
    profile: {
      childName: profileRow?.child_name ?? 'Henry',
      photoDataUrl: await readPhotoDataUrl(env, profileRow?.photo_key ?? null),
      photoKey: profileRow?.photo_key ?? null,
      updatedAt: profileRow?.updated_at ?? nowIso(),
      updatedByDeviceId: profileRow?.updated_by_device_id ?? null,
    },
    rewards,
    totalPoints: history.reduce(
      (total, event) => total + (event.type === 'add' ? event.points : -event.points),
      0,
    ),
  }
}

const insertPointEvent = async (
  env: WorkerEnv,
  familyId: string,
  event: HistoryEntry,
) => {
  const delta = event.type === 'add' ? event.points : -event.points
  const result = await env.DB.prepare(
    `INSERT OR IGNORE INTO point_events (
      id, family_id, device_id, parent_name, delta, label, reason, created_at_client, received_at_server
    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`,
  )
    .bind(
      event.id,
      familyId,
      event.deviceId,
      event.actorName,
      delta,
      event.reason,
      event.reason,
      event.timestamp,
      nowIso(),
    )
    .run()

  return result.meta.changes > 0
}

const upsertProfile = async (
  env: WorkerEnv,
  familyId: string,
  deviceId: string,
  profile: Profile,
) => {
  const photoKey = profile.photoDataUrl
    ? await uploadPhotoDataUrl(env, familyId, profile.photoDataUrl)
    : profile.photoKey

  await env.DB.prepare(
    `INSERT INTO profiles (family_id, child_name, photo_key, updated_at, updated_by_device_id)
     VALUES (?1, ?2, ?3, ?4, ?5)
     ON CONFLICT(family_id) DO UPDATE SET
       child_name = excluded.child_name,
       photo_key = excluded.photo_key,
       updated_at = excluded.updated_at,
       updated_by_device_id = excluded.updated_by_device_id`,
  )
    .bind(familyId, profile.childName, photoKey, profile.updatedAt || nowIso(), deviceId)
    .run()
}

const replacePresets = async (
  env: WorkerEnv,
  familyId: string,
  deviceId: string,
  presets: Presets,
) => {
  const allPresets = [...presets.add, ...presets.remove]
  const presetIds = allPresets.map((preset) => preset.id)

  if (presetIds.length) {
    await env.DB.prepare(
      `UPDATE presets
       SET deleted_at = ?1, updated_at = ?1, updated_by_device_id = ?2
       WHERE family_id = ?3 AND id NOT IN (${presetIds.map((_, index) => `?${index + 4}`).join(', ')})`,
    )
      .bind(nowIso(), deviceId, familyId, ...presetIds)
      .run()
  } else {
    await env.DB.prepare(
      `UPDATE presets
       SET deleted_at = ?1, updated_at = ?1, updated_by_device_id = ?2
       WHERE family_id = ?3`,
    )
      .bind(nowIso(), deviceId, familyId)
      .run()
  }

  for (const preset of allPresets) {
    const type = presets.add.some((item) => item.id === preset.id) ? 'add' : 'remove'
    await env.DB.prepare(
      `INSERT INTO presets (
        id, family_id, type, label, points, icon, visible_on_home, sort_order, source, deleted_at, updated_at, updated_by_device_id
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
      ON CONFLICT(id) DO UPDATE SET
        type = excluded.type,
        label = excluded.label,
        points = excluded.points,
        icon = excluded.icon,
        visible_on_home = excluded.visible_on_home,
        sort_order = excluded.sort_order,
        source = excluded.source,
        deleted_at = excluded.deleted_at,
        updated_at = excluded.updated_at,
        updated_by_device_id = excluded.updated_by_device_id`,
    )
      .bind(
        preset.id,
        familyId,
        type,
        preset.label,
        preset.points,
        preset.icon,
        preset.visibleOnHome ? 1 : 0,
        preset.sortOrder,
        preset.source,
        preset.deletedAt,
        preset.updatedAt || nowIso(),
        deviceId,
      )
      .run()
  }
}

const replaceRewards = async (
  env: WorkerEnv,
  familyId: string,
  deviceId: string,
  rewards: Reward[],
) => {
  const rewardIds = rewards.map((reward) => reward.id)

  if (rewardIds.length) {
    await env.DB.prepare(
      `UPDATE rewards
       SET deleted_at = ?1, updated_at = ?1, updated_by_device_id = ?2
       WHERE family_id = ?3 AND id NOT IN (${rewardIds.map((_, index) => `?${index + 4}`).join(', ')})`,
    )
      .bind(nowIso(), deviceId, familyId, ...rewardIds)
      .run()
  } else {
    await env.DB.prepare(
      `UPDATE rewards
       SET deleted_at = ?1, updated_at = ?1, updated_by_device_id = ?2
       WHERE family_id = ?3`,
    )
      .bind(nowIso(), deviceId, familyId)
      .run()
  }

  for (const reward of rewards) {
    await env.DB.prepare(
      `INSERT INTO rewards (
        id, family_id, title, description, points_required, claimed, claimed_at, sort_order, deleted_at, updated_at, updated_by_device_id
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        points_required = excluded.points_required,
        claimed = excluded.claimed,
        claimed_at = excluded.claimed_at,
        sort_order = excluded.sort_order,
        deleted_at = excluded.deleted_at,
        updated_at = excluded.updated_at,
        updated_by_device_id = excluded.updated_by_device_id`,
    )
      .bind(
        reward.id,
        familyId,
        reward.title,
        reward.description,
        reward.milestone,
        reward.isClaimed ? 1 : 0,
        reward.claimedAt,
        reward.sortOrder,
        reward.deletedAt,
        reward.updatedAt || nowIso(),
        deviceId,
      )
      .run()
  }
}

const mapPreset = (preset: {
  deleted_at: string | null
  icon: string | null
  id: string
  label: string
  points: number
  sort_order: number
  source: string
  updated_at: string
  updated_by_device_id: string | null
  visible_on_home: number
}) =>
  ({
    deletedAt: preset.deleted_at,
    icon: preset.icon,
    id: preset.id,
    label: preset.label,
    points: preset.points,
    sortOrder: preset.sort_order,
    source: preset.source === 'default' ? 'default' : 'custom',
    updatedAt: preset.updated_at,
    updatedByDeviceId: preset.updated_by_device_id,
    visibleOnHome: preset.visible_on_home === 1,
  }) satisfies PresetAction

const mapDevice = (device: {
  created_at: string
  device_name: string
  id: string
  is_primary: number
  last_seen_at: string | null
  parent_name: string
  revoked_at: string | null
}) =>
  ({
    createdAt: device.created_at,
    deviceName: device.device_name,
    id: device.id,
    isPrimary: device.is_primary === 1,
    lastSeenAt: device.last_seen_at,
    parentName: device.parent_name,
    revokedAt: device.revoked_at,
  }) satisfies LinkedDevice
