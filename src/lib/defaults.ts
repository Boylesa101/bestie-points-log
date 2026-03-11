import type {
  AppMetadata,
  AppSettings,
  HistoryEntry,
  LinkedDevice,
  PairingCodeState,
  ParentLockSettings,
  PointActionType,
  PresetAction,
  PresetSource,
  Presets,
  Profile,
  QueuedMutation,
  RewardCategory,
  RewardRedemptionType,
  Reward,
  SyncSession,
} from '../types/app'

export const STORAGE_SCHEMA_VERSION = 5
export const DEFAULT_RECORD_TIMESTAMP = '1970-01-01T00:00:00.000Z'

export const DEFAULT_PROFILE: Profile = {
  childName: 'Henry',
  photoDataUrl: null,
  photoKey: null,
  updatedAt: DEFAULT_RECORD_TIMESTAMP,
  updatedByDeviceId: null,
}

export const DEFAULT_TOTAL_POINTS = 0

export const DEFAULT_PRESETS: Presets = {
  add: [
    createDefaultPreset('preset-add-super-good', 'Been super good', '🌟', 50, 0),
    createDefaultPreset('preset-add-dinner', 'Ate all dinner', '🍽️', 50, 1),
    createDefaultPreset('preset-add-toys', 'Tidied toys', '🧸', 50, 2),
    createDefaultPreset('preset-add-teeth', 'Brushed teeth', '🪥', 50, 3),
    createDefaultPreset('preset-add-hands', 'Washed hands', '🫧', 50, 4),
  ],
  remove: [
    createDefaultPreset('preset-remove-bed', 'Wee-wee in bed', '💧', 50, 0),
    createDefaultPreset('preset-remove-tantrum', 'Tantrum', '😤', 50, 1),
    createDefaultPreset('preset-remove-lying', 'Lying', '🙈', 50, 2),
  ],
}

export const DEFAULT_REWARDS: Reward[] = [
  createDefaultReward('reward-sticker', 'Sticker', 'sticker', 'Pick a shiny sticker for the chart.', 500, 0),
  createDefaultReward('reward-treat', 'Treat', 'treat', 'Choose a little snack or treat.', 1000, 1),
  createDefaultReward('reward-adventure', 'Park adventure', 'day-out', 'A special play trip to the park.', 1500, 2, {
    eligibilityNotes: 'Parent can add the booking link, code, and venue details later.',
    venueName: 'Local adventure',
    visibleBeforeUnlock: true,
  }),
]

export const DEFAULT_PARENT_LOCK: ParentLockSettings = {
  enabled: false,
  isLocked: false,
  pin: null,
}

export const DEFAULT_SETTINGS: AppSettings = {
  deviceName: '',
  gentleLanguageCheckEnabled: true,
  hasCompletedSetup: false,
  hasSeenIntro: false,
  reminderEnabled: false,
  reminderTime: '17:00',
  parentDisplayName: 'Parent',
  parentLock: DEFAULT_PARENT_LOCK,
  soundEnabled: true,
  toneCheckSuggestionsEnabled: true,
  toneCheckSupportEnabled: true,
}

export const DEFAULT_METADATA: AppMetadata = {
  lastExportedAt: null,
  lastImportedAt: null,
  lastImportedSchemaVersion: null,
  lastPointsActivityDate: null,
  lastReminderShownDate: null,
  lastMigratedToSyncAt: null,
  notificationPermissionState: 'default',
  schemaVersion: STORAGE_SCHEMA_VERSION,
}

export const DEFAULT_SYNC_SESSION: SyncSession = {
  activePairingCode: null,
  cursor: 0,
  deviceId: null,
  deviceToken: null,
  familyId: null,
  lastError: null,
  lastSyncAt: null,
  linkedDevices: [],
  mode: 'local',
  pairedAt: null,
  primaryDeviceId: null,
  retryCount: 0,
  revokedAt: null,
  status: 'local',
}

const DEFAULT_PRESET_IDS = new Set(
  [...DEFAULT_PRESETS.add, ...DEFAULT_PRESETS.remove].map((preset) => preset.id),
)

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const normalizeText = (value: unknown, fallback = '', maxLength = 80) => {
  if (typeof value !== 'string') {
    return fallback
  }

  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, maxLength) : fallback
}

const normalizePhoto = (value: unknown) =>
  typeof value === 'string' && value.startsWith('data:image/')
    ? value
    : null

const normalizePhotoKey = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value.trim() : null

const normalizeIcon = (value: unknown) => {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, 8) : null
}

const normalizePositiveInt = (value: unknown, fallback = 0) => {
  const numericValue =
    typeof value === 'number' ? value : Number.parseInt(String(value), 10)

  if (!Number.isFinite(numericValue)) {
    return fallback
  }

  return Math.max(0, Math.round(numericValue))
}

const normalizeBoolean = (value: unknown, fallback = false) =>
  typeof value === 'boolean' ? value : fallback

const normalizeRewardCategory = (value: unknown): RewardCategory => {
  if (value === 'day-out' || value === 'home' || value === 'sticker' || value === 'treat') {
    return value
  }

  return 'sticker'
}

const normalizeRewardRedemptionType = (value: unknown): RewardRedemptionType =>
  value === 'unlock-only' ? 'unlock-only' : 'spend-points'

export const normalizeTimestamp = (
  value: unknown,
  fallback: string | null = null,
) =>
  typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : fallback

const sanitizeParentLock = (value: unknown): ParentLockSettings => {
  if (!isRecord(value)) {
    return DEFAULT_PARENT_LOCK
  }

  const pin =
    typeof value.pin === 'string' && /^\d{4,8}$/.test(value.pin)
      ? value.pin
      : null
  const enabled = normalizeBoolean(value.enabled, DEFAULT_PARENT_LOCK.enabled) && pin !== null

  return {
    enabled,
    isLocked: enabled && normalizeBoolean(value.isLocked),
    pin,
  }
}

export const sanitizeProfile = (value: unknown): Profile => {
  if (!isRecord(value)) {
    return DEFAULT_PROFILE
  }

  return {
    childName: normalizeText(value.childName, DEFAULT_PROFILE.childName, 40),
    photoDataUrl: normalizePhoto(value.photoDataUrl),
    photoKey: normalizePhotoKey(value.photoKey),
    updatedAt: normalizeTimestamp(value.updatedAt, DEFAULT_RECORD_TIMESTAMP) ?? DEFAULT_RECORD_TIMESTAMP,
    updatedByDeviceId: normalizeText(value.updatedByDeviceId, '', 80) || null,
  }
}

export const sanitizeTotalPoints = (value: unknown) =>
  normalizePositiveInt(value, DEFAULT_TOTAL_POINTS)

const sanitizePresetSource = (value: unknown, id: string): PresetSource => {
  if (value === 'custom' || value === 'default') {
    return value
  }

  return DEFAULT_PRESET_IDS.has(id) ? 'default' : 'custom'
}

const sanitizePresetList = (value: unknown): PresetAction[] => {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter(isRecord)
    .map((preset, index) => {
      const label = normalizeText(preset.label)
      const points = normalizePositiveInt(preset.points)
      const id =
        typeof preset.id === 'string' && preset.id.trim()
          ? preset.id
          : createId()

      if (!label || points < 1) {
        return null
      }

      return {
        deletedAt: normalizeTimestamp(preset.deletedAt, null),
        icon: normalizeIcon(preset.icon),
        id,
        label,
        points,
        sortOrder: normalizePositiveInt(preset.sortOrder, index),
        source: sanitizePresetSource(preset.source, id),
        updatedAt:
          normalizeTimestamp(preset.updatedAt, DEFAULT_RECORD_TIMESTAMP) ??
          DEFAULT_RECORD_TIMESTAMP,
        updatedByDeviceId: normalizeText(preset.updatedByDeviceId, '', 80) || null,
        visibleOnHome: normalizeBoolean(preset.visibleOnHome, true),
      }
    })
    .filter((preset): preset is PresetAction => preset !== null)
    .sort((left, right) => left.sortOrder - right.sortOrder)
}

export const sanitizePresets = (value: unknown): Presets => {
  if (!isRecord(value)) {
    return DEFAULT_PRESETS
  }

  return {
    add: Array.isArray(value.add)
      ? sanitizePresetList(value.add)
      : DEFAULT_PRESETS.add,
    remove: Array.isArray(value.remove)
      ? sanitizePresetList(value.remove)
      : DEFAULT_PRESETS.remove,
  }
}

export const sanitizeHistory = (value: unknown): HistoryEntry[] => {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter(isRecord)
    .map((entry) => {
      const type: PointActionType =
        entry.type === 'remove' ? 'remove' : entry.type === 'add' ? 'add' : 'add'
      const points = normalizePositiveInt(entry.points)
      const reason = normalizeText(entry.reason)
      const timestamp =
        normalizeTimestamp(entry.timestamp, new Date().toISOString()) ??
        new Date().toISOString()

      if (points < 1 || !reason) {
        return null
      }

      return {
        actorName: normalizeText(entry.actorName, 'Parent', 40),
        createdLocallyAt:
          normalizeTimestamp(entry.createdLocallyAt, timestamp) ?? timestamp,
        deviceId: normalizeText(entry.deviceId, 'local-device', 80),
        id:
          typeof entry.id === 'string' && entry.id.trim()
            ? entry.id
            : createId(),
        points,
        reason,
        syncedAt: normalizeTimestamp(entry.syncedAt, null),
        syncStatus:
          entry.syncStatus === 'error' || entry.syncStatus === 'pending' || entry.syncStatus === 'synced'
            ? entry.syncStatus
            : 'synced',
        timestamp,
        type,
      }
    })
    .filter((entry): entry is HistoryEntry => entry !== null)
    .sort((left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp))
    .slice(0, 500)
}

export const sanitizeRewards = (value: unknown): Reward[] => {
  if (!Array.isArray(value)) {
    return DEFAULT_REWARDS
  }

  return value
    .filter(isRecord)
    .map((reward, index) => {
      const title = normalizeText(reward.title)
      const milestone = normalizePositiveInt(reward.milestone)
      const description = normalizeText(reward.description, '', 140)
      const category = normalizeRewardCategory(reward.category)
      const claimedAt = normalizeTimestamp(reward.claimedAt, null)
      const redeemedAt = normalizeTimestamp(reward.redeemedAt, claimedAt)
      const unlockedAt = normalizeTimestamp(reward.unlockedAt, null)
      const isClaimed =
        normalizeBoolean(reward.isClaimed) || claimedAt !== null || redeemedAt !== null

      if (!title || milestone < 1) {
        return null
      }

      return {
        bookingUrl: normalizeText(reward.bookingUrl, '', 240),
        category,
        claimedAt,
        costPoints: normalizePositiveInt(reward.costPoints, milestone) || milestone,
        discountCode: normalizeText(reward.discountCode, '', 80),
        deletedAt: normalizeTimestamp(reward.deletedAt, null),
        description,
        eligibilityNotes: normalizeText(reward.eligibilityNotes, '', 280),
        hasCelebratedUnlock: normalizeBoolean(
          reward.hasCelebratedUnlock,
          unlockedAt !== null || isClaimed,
        ),
        id:
          typeof reward.id === 'string' && reward.id.trim()
            ? reward.id
            : createId(),
        icon: normalizeIcon(reward.icon),
        isClaimed,
        lastCheckedAt: normalizeTimestamp(reward.lastCheckedAt, null),
        milestone,
        offerSource: normalizeText(reward.offerSource, '', 140),
        redeemedAt,
        redemptionType: normalizeRewardRedemptionType(reward.redemptionType),
        sortOrder: normalizePositiveInt(reward.sortOrder, index),
        title,
        unlockedAt,
        updatedAt:
          normalizeTimestamp(reward.updatedAt, DEFAULT_RECORD_TIMESTAMP) ??
          DEFAULT_RECORD_TIMESTAMP,
        updatedByDeviceId: normalizeText(reward.updatedByDeviceId, '', 80) || null,
        venueName: normalizeText(reward.venueName, '', 140),
        venueTemplate: normalizeText(reward.venueTemplate, '', 80) || null,
        visibleBeforeUnlock: normalizeBoolean(reward.visibleBeforeUnlock, true),
      }
    })
    .filter((reward): reward is Reward => reward !== null)
    .sort((left, right) => left.sortOrder - right.sortOrder)
}

export const sanitizeSettings = (value: unknown): AppSettings => {
  if (!isRecord(value)) {
    return DEFAULT_SETTINGS
  }

  const reminderTime =
    typeof value.reminderTime === 'string' && /^\d{2}:\d{2}$/.test(value.reminderTime)
      ? value.reminderTime
      : DEFAULT_SETTINGS.reminderTime

  return {
    deviceName: normalizeText(value.deviceName, '', 40),
    gentleLanguageCheckEnabled: normalizeBoolean(
      value.gentleLanguageCheckEnabled,
      DEFAULT_SETTINGS.gentleLanguageCheckEnabled,
    ),
    hasCompletedSetup: Boolean(value.hasCompletedSetup),
    hasSeenIntro: Boolean(value.hasSeenIntro),
    reminderEnabled: normalizeBoolean(value.reminderEnabled, DEFAULT_SETTINGS.reminderEnabled),
    reminderTime,
    parentDisplayName: normalizeText(value.parentDisplayName, 'Parent', 40),
    parentLock: sanitizeParentLock(value.parentLock),
    soundEnabled: normalizeBoolean(value.soundEnabled, DEFAULT_SETTINGS.soundEnabled),
    toneCheckSuggestionsEnabled: normalizeBoolean(
      value.toneCheckSuggestionsEnabled,
      DEFAULT_SETTINGS.toneCheckSuggestionsEnabled,
    ),
    toneCheckSupportEnabled: normalizeBoolean(
      value.toneCheckSupportEnabled,
      DEFAULT_SETTINGS.toneCheckSupportEnabled,
    ),
  }
}

export const sanitizeMetadata = (value: unknown): AppMetadata => {
  if (!isRecord(value)) {
    return DEFAULT_METADATA
  }

  return {
    lastExportedAt: normalizeTimestamp(value.lastExportedAt, null),
    lastImportedAt: normalizeTimestamp(value.lastImportedAt, null),
    lastImportedSchemaVersion:
      value.lastImportedSchemaVersion === null ||
      value.lastImportedSchemaVersion === undefined
        ? null
        : normalizePositiveInt(value.lastImportedSchemaVersion),
    lastPointsActivityDate:
      typeof value.lastPointsActivityDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.lastPointsActivityDate)
        ? value.lastPointsActivityDate
        : null,
    lastReminderShownDate:
      typeof value.lastReminderShownDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.lastReminderShownDate)
        ? value.lastReminderShownDate
        : null,
    lastMigratedToSyncAt: normalizeTimestamp(value.lastMigratedToSyncAt, null),
    notificationPermissionState:
      value.notificationPermissionState === 'granted' ||
      value.notificationPermissionState === 'denied' ||
      value.notificationPermissionState === 'unsupported'
        ? value.notificationPermissionState
        : 'default',
    schemaVersion:
      normalizePositiveInt(value.schemaVersion, STORAGE_SCHEMA_VERSION) ||
      STORAGE_SCHEMA_VERSION,
  }
}

const sanitizeLinkedDevice = (value: unknown): LinkedDevice | null => {
  if (!isRecord(value)) {
    return null
  }

  const id = normalizeText(value.id, '', 80)

  if (!id) {
    return null
  }

  return {
    createdAt:
      normalizeTimestamp(value.createdAt, DEFAULT_RECORD_TIMESTAMP) ??
      DEFAULT_RECORD_TIMESTAMP,
    deviceName: normalizeText(value.deviceName, 'Phone', 40),
    id,
    isPrimary: normalizeBoolean(value.isPrimary),
    lastSeenAt: normalizeTimestamp(value.lastSeenAt, null),
    parentName: normalizeText(value.parentName, 'Parent', 40),
    revokedAt: normalizeTimestamp(value.revokedAt, null),
  }
}

const sanitizePairingCode = (value: unknown): PairingCodeState | null => {
  if (!isRecord(value)) {
    return null
  }

  const code = normalizeText(value.code, '', 24)
  const createdAt = normalizeTimestamp(value.createdAt, null)
  const expiresAt = normalizeTimestamp(value.expiresAt, null)

  if (!code || !createdAt || !expiresAt) {
    return null
  }

  return {
    code,
    createdAt,
    expiresAt,
  }
}

export const sanitizeSyncSession = (value: unknown): SyncSession => {
  if (!isRecord(value)) {
    return DEFAULT_SYNC_SESSION
  }

  const mode = value.mode === 'synced' ? 'synced' : 'local'
  const status =
    value.status === 'error' ||
    value.status === 'offline' ||
    value.status === 'revoked' ||
    value.status === 'synced' ||
    value.status === 'syncing'
      ? value.status
      : mode === 'synced'
        ? 'offline'
        : 'local'

  return {
    activePairingCode: sanitizePairingCode(value.activePairingCode),
    cursor: normalizePositiveInt(value.cursor, 0),
    deviceId: normalizeText(value.deviceId, '', 80) || null,
    deviceToken: normalizeText(value.deviceToken, '', 120) || null,
    familyId: normalizeText(value.familyId, '', 80) || null,
    lastError: normalizeText(value.lastError, '', 140) || null,
    lastSyncAt: normalizeTimestamp(value.lastSyncAt, null),
    linkedDevices: Array.isArray(value.linkedDevices)
      ? value.linkedDevices
          .map(sanitizeLinkedDevice)
          .filter((device): device is LinkedDevice => device !== null)
      : [],
    mode,
    pairedAt: normalizeTimestamp(value.pairedAt, null),
    primaryDeviceId: normalizeText(value.primaryDeviceId, '', 80) || null,
    retryCount: normalizePositiveInt(value.retryCount, 0),
    revokedAt: normalizeTimestamp(value.revokedAt, null),
    status,
  }
}

export const sanitizeMutationQueue = (value: unknown): QueuedMutation[] => {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter(isRecord)
    .map((mutation) => {
      const id = normalizeText(mutation.id, '', 120)
      const createdAt = normalizeTimestamp(mutation.createdAt, null)
      const kind =
        mutation.kind === 'point-event' ||
        mutation.kind === 'profile' ||
        mutation.kind === 'presets' ||
        mutation.kind === 'rewards'
          ? mutation.kind
          : null

      if (!id || !createdAt || !kind) {
        return null
      }

      const base = {
        attempts: normalizePositiveInt(mutation.attempts, 0),
        createdAt,
        id,
        kind,
        lastAttemptAt: normalizeTimestamp(mutation.lastAttemptAt, null),
      }

      if (kind === 'point-event') {
        const event = sanitizeHistory([
          isRecord(mutation.payload) ? mutation.payload.event : null,
        ])[0]

        if (!event) {
          return null
        }

        return {
          ...base,
          kind,
          payload: {
            event,
          },
        }
      }

      if (kind === 'profile') {
        return {
          ...base,
          kind,
          payload: {
            profile: sanitizeProfile(isRecord(mutation.payload) ? mutation.payload.profile : null),
          },
        }
      }

      if (kind === 'presets') {
        return {
          ...base,
          kind,
          payload: {
            presets: sanitizePresets(isRecord(mutation.payload) ? mutation.payload.presets : null),
          },
        }
      }

      return {
        ...base,
        kind,
        payload: {
          rewards: sanitizeRewards(isRecord(mutation.payload) ? mutation.payload.rewards : null),
        },
      }
    })
    .filter((mutation): mutation is QueuedMutation => mutation !== null)
}

export const deriveTotalPoints = (history: HistoryEntry[]) =>
  Math.max(
    history.reduce(
      (total, entry) => total + (entry.type === 'add' ? entry.points : -entry.points),
      0,
    ),
    0,
  )

function createDefaultPreset(
  id: string,
  label: string,
  icon: string,
  points: number,
  sortOrder: number,
): PresetAction {
  return {
    deletedAt: null,
    icon,
    id,
    label,
    points,
    sortOrder,
    source: 'default',
    updatedAt: DEFAULT_RECORD_TIMESTAMP,
    updatedByDeviceId: null,
    visibleOnHome: true,
  }
}

function createDefaultReward(
  id: string,
  title: string,
  category: RewardCategory,
  description: string,
  milestone: number,
  sortOrder: number,
  overrides: Partial<Reward> = {},
): Reward {
  return {
    bookingUrl: '',
    category,
    claimedAt: null,
    costPoints: milestone,
    discountCode: '',
    deletedAt: null,
    description,
    eligibilityNotes: '',
    hasCelebratedUnlock: false,
    id,
    icon: null,
    isClaimed: false,
    lastCheckedAt: null,
    milestone,
    offerSource: '',
    redeemedAt: null,
    redemptionType: 'spend-points',
    sortOrder,
    title,
    unlockedAt: null,
    updatedAt: DEFAULT_RECORD_TIMESTAMP,
    updatedByDeviceId: null,
    venueName: '',
    venueTemplate: null,
    visibleBeforeUnlock: true,
    ...overrides,
  }
}

export const createId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `bestie-${Date.now()}-${Math.random().toString(16).slice(2)}`
}
