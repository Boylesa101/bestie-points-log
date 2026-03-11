import {
  DEFAULT_METADATA,
  STORAGE_SCHEMA_VERSION,
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
import type { AppDataSnapshot } from '../types/app'

const APP_EXPORT_MARKER = 'bestie-points-log'

interface ExportEnvelope {
  app: string
  data: AppDataSnapshot
  exportedAt: string
  schemaVersion: number
}

interface ParsedImportResult {
  importedSchemaVersion: number
  snapshot: AppDataSnapshot
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const hasSnapshotShape = (value: unknown) => {
  if (!isRecord(value)) {
    return false
  }

  const keys = ['history', 'presets', 'profile', 'rewards', 'settings', 'totalPoints']
  return keys.some((key) => key in value)
}

export const buildExportEnvelope = (
  snapshot: AppDataSnapshot,
  exportedAt: string,
): ExportEnvelope => ({
  app: APP_EXPORT_MARKER,
  data: snapshot,
  exportedAt,
  schemaVersion: snapshot.metadata.schemaVersion,
})

export const buildExportFilename = (exportedAt: string) =>
  `bestie-points-log-${exportedAt.slice(0, 10)}.json`

export const parseImportText = (text: string): ParsedImportResult => {
  let parsedValue: unknown

  try {
    parsedValue = JSON.parse(text)
  } catch {
    throw new Error('That file is not valid JSON.')
  }

  const extractedData = extractImportData(parsedValue)

  if (!extractedData) {
    throw new Error('That file does not look like a Bestie Points Log backup.')
  }

  return {
    importedSchemaVersion: extractedData.importedSchemaVersion,
    snapshot: sanitizeSnapshot(extractedData.snapshot),
  }
}

const extractImportData = (value: unknown) => {
  if (!isRecord(value)) {
    return null
  }

  if (
    value.app === APP_EXPORT_MARKER &&
    hasSnapshotShape(value.data)
  ) {
    return {
      importedSchemaVersion: normalizeSchemaVersion(value.schemaVersion),
      snapshot: value.data,
    }
  }

  if (hasSnapshotShape(value)) {
    return {
      importedSchemaVersion: normalizeSchemaVersion(
        isRecord(value.metadata) ? value.metadata.schemaVersion : undefined,
      ),
      snapshot: value,
    }
  }

  return null
}

const sanitizeSnapshot = (value: unknown): AppDataSnapshot => {
  const recordValue = isRecord(value) ? value : {}
  const sanitizedMetadata = sanitizeMetadata(recordValue.metadata)

  return {
    history: sanitizeHistory(recordValue.history),
    metadata: {
      ...DEFAULT_METADATA,
      ...sanitizedMetadata,
      schemaVersion: sanitizedMetadata.schemaVersion || STORAGE_SCHEMA_VERSION,
    },
    mutationQueue: sanitizeMutationQueue(recordValue.mutationQueue),
    presets: sanitizePresets(recordValue.presets),
    profile: sanitizeProfile(recordValue.profile),
    rewards: sanitizeRewards(recordValue.rewards),
    settings: sanitizeSettings(recordValue.settings),
    syncSession: sanitizeSyncSession(recordValue.syncSession),
    totalPoints: sanitizeTotalPoints(recordValue.totalPoints),
  }
}

const normalizeSchemaVersion = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.round(value)
  }

  if (typeof value === 'string') {
    const parsedValue = Number.parseInt(value, 10)

    if (Number.isFinite(parsedValue) && parsedValue > 0) {
      return parsedValue
    }
  }

  return STORAGE_SCHEMA_VERSION
}
