import {
  DEFAULT_METADATA,
  DEFAULT_PRESETS,
  DEFAULT_PROFILE,
  DEFAULT_REWARDS,
  DEFAULT_SETTINGS,
  DEFAULT_SYNC_SESSION,
  DEFAULT_TOTAL_POINTS,
  sanitizeHistory,
  sanitizeMetadata,
  sanitizeMutationQueue,
  sanitizePresets,
  sanitizeProfile,
  sanitizeRewards,
  sanitizeSettings,
  sanitizeSyncSession,
  sanitizeTotalPoints,
} from './defaults'
import type {
  AppMetadata,
  AppSettings,
  HistoryEntry,
  Presets,
  Profile,
  QueuedMutation,
  Reward,
  SyncSession,
} from '../types/app'

const STORAGE_KEYS = {
  history: 'bestie-points-log/history',
  metadata: 'bestie-points-log/metadata',
  mutationQueue: 'bestie-points-log/mutation-queue',
  presets: 'bestie-points-log/presets',
  profile: 'bestie-points-log/profile',
  rewards: 'bestie-points-log/rewards',
  settings: 'bestie-points-log/settings',
  syncSession: 'bestie-points-log/sync-session',
  totalPoints: 'bestie-points-log/total-points',
} as const

export interface StorageResult {
  message?: string
  ok: boolean
}

const getStorage = () =>
  typeof window === 'undefined' ? null : window.localStorage

const writeValue = (key: string, value: unknown): StorageResult => {
  const storage = getStorage()

  if (!storage) {
    return { ok: true }
  }

  try {
    storage.setItem(key, JSON.stringify(value))
    return { ok: true }
  } catch {
    return {
      ok: false,
      message:
        'This device is full, so the newest change could not be stored in local storage.',
    }
  }
}

const readValue = <T>(
  key: string,
  fallback: T,
  sanitize: (value: unknown) => T,
): T => {
  const storage = getStorage()

  if (!storage) {
    return fallback
  }

  const rawValue = storage.getItem(key)

  if (!rawValue) {
    void writeValue(key, fallback)
    return fallback
  }

  try {
    const parsedValue = JSON.parse(rawValue)
    const nextValue = sanitize(parsedValue)
    void writeValue(key, nextValue)
    return nextValue
  } catch {
    void writeValue(key, fallback)
    return fallback
  }
}

export const readProfile = () =>
  readValue(STORAGE_KEYS.profile, DEFAULT_PROFILE, sanitizeProfile)

export const writeProfile = (profile: Profile) =>
  writeValue(STORAGE_KEYS.profile, sanitizeProfile(profile))

export const readTotalPoints = () =>
  readValue(STORAGE_KEYS.totalPoints, DEFAULT_TOTAL_POINTS, sanitizeTotalPoints)

export const writeTotalPoints = (totalPoints: number) =>
  writeValue(STORAGE_KEYS.totalPoints, sanitizeTotalPoints(totalPoints))

export const readPresets = () =>
  readValue(STORAGE_KEYS.presets, DEFAULT_PRESETS, sanitizePresets)

export const writePresets = (presets: Presets) =>
  writeValue(STORAGE_KEYS.presets, sanitizePresets(presets))

export const readHistory = () =>
  readValue(STORAGE_KEYS.history, [] as HistoryEntry[], sanitizeHistory)

export const writeHistory = (history: HistoryEntry[]) =>
  writeValue(STORAGE_KEYS.history, sanitizeHistory(history))

export const readRewards = () =>
  readValue(STORAGE_KEYS.rewards, DEFAULT_REWARDS, sanitizeRewards)

export const writeRewards = (rewards: Reward[]) =>
  writeValue(STORAGE_KEYS.rewards, sanitizeRewards(rewards))

export const readMetadata = () =>
  readValue(STORAGE_KEYS.metadata, DEFAULT_METADATA, sanitizeMetadata)

export const writeMetadata = (metadata: AppMetadata) =>
  writeValue(STORAGE_KEYS.metadata, sanitizeMetadata(metadata))

export const readSettings = () =>
  readValue(STORAGE_KEYS.settings, DEFAULT_SETTINGS, sanitizeSettings)

export const writeSettings = (settings: AppSettings) =>
  writeValue(STORAGE_KEYS.settings, sanitizeSettings(settings))

export const readSyncSession = () =>
  readValue(STORAGE_KEYS.syncSession, DEFAULT_SYNC_SESSION, sanitizeSyncSession)

export const writeSyncSession = (syncSession: SyncSession) =>
  writeValue(STORAGE_KEYS.syncSession, sanitizeSyncSession(syncSession))

export const readMutationQueue = () =>
  readValue(STORAGE_KEYS.mutationQueue, [] as QueuedMutation[], sanitizeMutationQueue)

export const writeMutationQueue = (mutationQueue: QueuedMutation[]) =>
  writeValue(STORAGE_KEYS.mutationQueue, sanitizeMutationQueue(mutationQueue))
