import {
  createId,
  deriveTotalPoints,
  sanitizeHistory,
  sanitizePresets,
  sanitizeProfile,
  sanitizeRewards,
  sanitizeSyncSession,
} from '../defaults'
import type {
  AppDataSnapshot,
  HistoryEntry,
  LinkedDevice,
  PairingCodeState,
  PointActionType,
  Presets,
  Profile,
  QueuedMutation,
  Reward,
  SharedFamilySnapshot,
} from '../../types/app'

export const createPointEvent = (input: {
  actorName: string
  amount: number
  deviceId: string
  reason: string
  type: PointActionType
}) => {
  const timestamp = new Date().toISOString()

  return {
    actorName: input.actorName,
    createdLocallyAt: timestamp,
    deviceId: input.deviceId,
    id: createId(),
    points: Math.max(1, Math.round(input.amount)),
    reason: input.reason,
    syncedAt: null,
    syncStatus: 'pending' as const,
    timestamp,
    type: input.type,
  } satisfies HistoryEntry
}

export const createQueuedPointMutation = (event: HistoryEntry): QueuedMutation => ({
  attempts: 0,
  createdAt: event.createdLocallyAt,
  id: event.id,
  kind: 'point-event',
  lastAttemptAt: null,
  payload: {
    event,
  },
})

export const createQueuedProfileMutation = (profile: Profile): QueuedMutation => ({
  attempts: 0,
  createdAt: profile.updatedAt,
  id: createId(),
  kind: 'profile',
  lastAttemptAt: null,
  payload: {
    profile,
  },
})

export const createQueuedPresetsMutation = (presets: Presets): QueuedMutation => ({
  attempts: 0,
  createdAt: newestTimestamp(
    [...presets.add, ...presets.remove].map((preset) => preset.updatedAt),
  ),
  id: createId(),
  kind: 'presets',
  lastAttemptAt: null,
  payload: {
    presets,
  },
})

export const createQueuedRewardsMutation = (rewards: Reward[]): QueuedMutation => ({
  attempts: 0,
  createdAt: newestTimestamp(rewards.map((reward) => reward.updatedAt)),
  id: createId(),
  kind: 'rewards',
  lastAttemptAt: null,
  payload: {
    rewards,
  },
})

export const mergeRemoteSnapshot = (
  currentState: AppDataSnapshot,
  snapshot: SharedFamilySnapshot,
): AppDataSnapshot => ({
  ...currentState,
  history: sanitizeHistory(snapshot.history).map((entry) => ({
    ...entry,
    syncStatus: 'synced',
  })),
  presets: sanitizePresets(snapshot.presets),
  profile: sanitizeProfile(snapshot.profile),
  rewards: sanitizeRewards(snapshot.rewards),
  syncSession: sanitizeSyncSession({
    ...currentState.syncSession,
    activePairingCode: mergePairCode(
      currentState.syncSession.activePairingCode,
        snapshot.activePairingCode,
      ),
    cursor: snapshot.cursor,
    familyId: snapshot.familyId,
    lastError: null,
    lastSyncAt: new Date().toISOString(),
    linkedDevices: snapshot.devices,
    primaryDeviceId: findPrimaryDeviceId(snapshot.devices),
    status: 'synced',
  }),
  totalPoints: snapshot.totalPoints ?? deriveTotalPoints(snapshot.history),
})

export const markQueueAttempt = (queue: QueuedMutation[]) => {
  const attemptedAt = new Date().toISOString()

  return queue.map((mutation) => ({
    ...mutation,
    attempts: mutation.attempts + 1,
    lastAttemptAt: attemptedAt,
  }))
}

const newestTimestamp = (timestamps: string[]) =>
  timestamps.sort().at(-1) ?? new Date().toISOString()

const mergePairCode = (
  localCode: PairingCodeState | null,
  remoteCode: PairingCodeState | null,
) => {
  if (localCode && localCode.code !== 'ACTIVE') {
    return localCode
  }

  return remoteCode
}

const findPrimaryDeviceId = (devices: LinkedDevice[]) =>
  devices.find((device) => device.isPrimary)?.id ?? null
