import type {
  AppMetadata,
  AppSettings,
  HistoryEntry,
  ParentLockSettings,
  PointActionType,
  PresetAction,
  PresetSource,
  Presets,
  Profile,
  Reward,
} from '../types/app'

export const STORAGE_SCHEMA_VERSION = 2

export const DEFAULT_PROFILE: Profile = {
  childName: 'Henry',
  photoDataUrl: null,
}

export const DEFAULT_TOTAL_POINTS = 0

export const DEFAULT_PRESETS: Presets = {
  add: [
    createDefaultPreset('preset-add-super-good', 'Been super good', 50, 0),
    createDefaultPreset('preset-add-dinner', 'Ate all dinner', 50, 1),
    createDefaultPreset('preset-add-toys', 'Tidied toys', 50, 2),
    createDefaultPreset('preset-add-teeth', 'Brushed teeth', 50, 3),
    createDefaultPreset('preset-add-hands', 'Washed hands', 50, 4),
  ],
  remove: [
    createDefaultPreset('preset-remove-bed', 'Wee-wee in bed', 50, 0),
    createDefaultPreset('preset-remove-tantrum', 'Tantrum', 50, 1),
    createDefaultPreset('preset-remove-lying', 'Lying', 50, 2),
  ],
}

export const DEFAULT_REWARDS: Reward[] = [
  {
    claimedAt: null,
    id: 'reward-sticker',
    isClaimed: false,
    title: 'Sticker',
    milestone: 500,
    description: 'Pick a shiny sticker for the chart.',
  },
  {
    claimedAt: null,
    id: 'reward-treat',
    isClaimed: false,
    title: 'Treat',
    milestone: 1000,
    description: 'Choose a little snack or treat.',
  },
  {
    claimedAt: null,
    id: 'reward-adventure',
    isClaimed: false,
    title: 'Park adventure',
    milestone: 1500,
    description: 'A special play trip to the park.',
  },
]

export const DEFAULT_PARENT_LOCK: ParentLockSettings = {
  enabled: false,
  isLocked: false,
  pin: null,
}

export const DEFAULT_SETTINGS: AppSettings = {
  hasCompletedSetup: false,
  hasSeenIntro: false,
  parentLock: DEFAULT_PARENT_LOCK,
  soundEnabled: true,
}

export const DEFAULT_METADATA: AppMetadata = {
  lastExportedAt: null,
  lastImportedAt: null,
  lastImportedSchemaVersion: null,
  schemaVersion: STORAGE_SCHEMA_VERSION,
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const normalizeText = (value: unknown, fallback = '') => {
  if (typeof value !== 'string') {
    return fallback
  }

  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, 80) : fallback
}

const normalizePhoto = (value: unknown) =>
  typeof value === 'string' && value.startsWith('data:image/')
    ? value
    : null

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

const normalizeTimestamp = (value: unknown) =>
  typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : null

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

const DEFAULT_PRESET_IDS = new Set(
  [...DEFAULT_PRESETS.add, ...DEFAULT_PRESETS.remove].map((preset) => preset.id),
)

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
        id,
        label,
        points,
        sortOrder: normalizePositiveInt(preset.sortOrder, index),
        source: sanitizePresetSource(preset.source, id),
        visibleOnHome: normalizeBoolean(preset.visibleOnHome, true),
      }
    })
    .filter((preset): preset is PresetAction => preset !== null)
    .sort((left, right) => left.sortOrder - right.sortOrder)
}

export const sanitizeProfile = (value: unknown): Profile => {
  if (!isRecord(value)) {
    return DEFAULT_PROFILE
  }

  return {
    childName: normalizeText(value.childName, DEFAULT_PROFILE.childName),
    photoDataUrl: normalizePhoto(value.photoDataUrl),
  }
}

export const sanitizeTotalPoints = (value: unknown) =>
  normalizePositiveInt(value, DEFAULT_TOTAL_POINTS)

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
        typeof entry.timestamp === 'string' &&
        !Number.isNaN(Date.parse(entry.timestamp))
          ? entry.timestamp
          : new Date().toISOString()

      if (points < 1 || !reason) {
        return null
      }

      return {
        id:
          typeof entry.id === 'string' && entry.id.trim()
            ? entry.id
            : createId(),
        timestamp,
        type,
        points,
        reason,
      }
    })
    .filter((entry): entry is HistoryEntry => entry !== null)
    .sort((left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp))
    .slice(0, 300)
}

export const sanitizeRewards = (value: unknown): Reward[] => {
  if (!Array.isArray(value)) {
    return DEFAULT_REWARDS
  }

  return value
    .filter(isRecord)
    .map((reward) => {
      const title = normalizeText(reward.title)
      const milestone = normalizePositiveInt(reward.milestone)
      const description = normalizeText(reward.description)
      const claimedAt = normalizeTimestamp(reward.claimedAt)
      const isClaimed = normalizeBoolean(reward.isClaimed) || claimedAt !== null

      if (!title || milestone < 1) {
        return null
      }

      return {
        claimedAt,
        id:
          typeof reward.id === 'string' && reward.id.trim()
            ? reward.id
            : createId(),
        isClaimed,
        title,
        milestone,
        description,
      }
    })
    .filter((reward): reward is Reward => reward !== null)
    .sort((left, right) => left.milestone - right.milestone)
}

export const sanitizeSettings = (value: unknown): AppSettings => {
  if (!isRecord(value)) {
    return DEFAULT_SETTINGS
  }

  return {
    hasCompletedSetup: Boolean(value.hasCompletedSetup),
    hasSeenIntro: Boolean(value.hasSeenIntro),
    parentLock: sanitizeParentLock(value.parentLock),
    soundEnabled: normalizeBoolean(value.soundEnabled, DEFAULT_SETTINGS.soundEnabled),
  }
}

export const sanitizeMetadata = (value: unknown): AppMetadata => {
  if (!isRecord(value)) {
    return DEFAULT_METADATA
  }

  return {
    lastExportedAt: normalizeTimestamp(value.lastExportedAt),
    lastImportedAt: normalizeTimestamp(value.lastImportedAt),
    lastImportedSchemaVersion:
      value.lastImportedSchemaVersion === null ||
      value.lastImportedSchemaVersion === undefined
        ? null
        : normalizePositiveInt(value.lastImportedSchemaVersion),
    schemaVersion: normalizePositiveInt(value.schemaVersion, STORAGE_SCHEMA_VERSION) || STORAGE_SCHEMA_VERSION,
  }
}

function createDefaultPreset(
  id: string,
  label: string,
  points: number,
  sortOrder: number,
): PresetAction {
  return {
  id,
  label,
  points,
  sortOrder,
  source: 'default',
  visibleOnHome: true,
  }
}

const sanitizePresetSource = (value: unknown, id: string): PresetSource => {
  if (value === 'custom' || value === 'default') {
    return value
  }

  return DEFAULT_PRESET_IDS.has(id) ? 'default' : 'custom'
}

export const createId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `bestie-${Date.now()}-${Math.random().toString(16).slice(2)}`
}
