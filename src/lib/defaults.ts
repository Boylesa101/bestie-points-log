import type {
  AppSettings,
  HistoryEntry,
  PointActionType,
  PresetAction,
  Presets,
  Profile,
  Reward,
} from '../types/app'

export const DEFAULT_PROFILE: Profile = {
  childName: 'Henry',
  photoDataUrl: null,
}

export const DEFAULT_TOTAL_POINTS = 0

export const DEFAULT_PRESETS: Presets = {
  add: [
    { id: 'preset-add-super-good', label: 'Been super good', points: 50 },
    { id: 'preset-add-dinner', label: 'Ate all dinner', points: 50 },
    { id: 'preset-add-toys', label: 'Tidied toys', points: 50 },
    { id: 'preset-add-teeth', label: 'Brushed teeth', points: 50 },
    { id: 'preset-add-hands', label: 'Washed hands', points: 50 },
  ],
  remove: [
    { id: 'preset-remove-bed', label: 'Wee-wee in bed', points: 50 },
    { id: 'preset-remove-tantrum', label: 'Tantrum', points: 50 },
    { id: 'preset-remove-lying', label: 'Lying', points: 50 },
  ],
}

export const DEFAULT_REWARDS: Reward[] = [
  {
    id: 'reward-sticker',
    title: 'Sticker',
    milestone: 500,
    description: 'Pick a shiny sticker for the chart.',
  },
  {
    id: 'reward-treat',
    title: 'Treat',
    milestone: 1000,
    description: 'Choose a little snack or treat.',
  },
  {
    id: 'reward-adventure',
    title: 'Park adventure',
    milestone: 1500,
    description: 'A special play trip to the park.',
  },
]

export const DEFAULT_SETTINGS: AppSettings = {
  hasCompletedSetup: false,
  hasSeenIntro: false,
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

const sanitizePresetList = (value: unknown): PresetAction[] => {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter(isRecord)
    .map((preset) => {
      const label = normalizeText(preset.label)
      const points = normalizePositiveInt(preset.points)

      if (!label || points < 1) {
        return null
      }

      return {
        id:
          typeof preset.id === 'string' && preset.id.trim()
            ? preset.id
            : createId(),
        label,
        points,
      }
    })
    .filter((preset): preset is PresetAction => preset !== null)
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

      if (!title || milestone < 1) {
        return null
      }

      return {
        id:
          typeof reward.id === 'string' && reward.id.trim()
            ? reward.id
            : createId(),
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
  }
}

export const createId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `bestie-${Date.now()}-${Math.random().toString(16).slice(2)}`
}
