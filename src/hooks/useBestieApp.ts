import { useCallback, useEffect, useRef, useState } from 'react'
import {
  createFamily,
  createPairCode,
  fetchLinkedDevices,
  pullSyncSnapshot,
  redeemPairCode,
  revokeLinkedDevice,
  pushSyncMutations,
} from '../lib/api/client'
import {
  DEFAULT_METADATA,
  deriveTotalPoints,
  sanitizeHistory,
  sanitizeMetadata,
  sanitizeMutationQueue,
  sanitizePresets,
  sanitizeProfile,
  sanitizeRewards,
  sanitizeSettings,
  sanitizeSyncSession,
  sanitizeTotalPoints,
} from '../lib/defaults'
import {
  createPointEvent,
  createQueuedPointMutation,
  createQueuedPresetsMutation,
  createQueuedProfileMutation,
  createQueuedRewardsMutation,
  markQueueAttempt,
  mergeRemoteSnapshot,
} from '../lib/sync/helpers'
import { isRewardReadyToReveal } from '../lib/rewards'
import {
  readHistory,
  readMetadata,
  readMutationQueue,
  readPresets,
  readProfile,
  readRewards,
  readSettings,
  readSyncSession,
  readTotalPoints,
  writeHistory,
  writeMetadata,
  writeMutationQueue,
  writePresets,
  writeProfile,
  writeRewards,
  writeSettings,
  writeSyncSession,
  writeTotalPoints,
} from '../lib/storage'
import type {
  AppDataSnapshot,
  AppMetadata,
  AppSettings,
  JoinFamilyInput,
  PairingCodeState,
  PointsActionInput,
  Presets,
  Profile,
  Reward,
  SharedFamilySnapshot,
  SyncSession,
} from '../types/app'

const loadInitialState = (): AppDataSnapshot => ({
  history: readHistory(),
  metadata: readMetadata(),
  mutationQueue: readMutationQueue(),
  presets: readPresets(),
  profile: readProfile(),
  rewards: readRewards(),
  settings: readSettings(),
  syncSession: readSyncSession(),
  totalPoints: readTotalPoints(),
})

const updateLocalSyncSession = (
  currentSession: SyncSession,
  partialSession: Partial<SyncSession>,
) =>
  sanitizeSyncSession({
    ...currentSession,
    ...partialSession,
  })

export const useBestieApp = () => {
  const [appState, setAppState] = useState(loadInitialState)
  const [activeRewardReveal, setActiveRewardReveal] = useState<Reward | null>(null)
  const [storageMessage, setStorageMessage] = useState<string | null>(null)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const appStateRef = useRef(appState)
  const syncInFlightRef = useRef(false)
  const syncRetryTimeoutRef = useRef<number | null>(null)
  const syncNowRef = useRef<() => Promise<boolean>>(async () => false)

  const persistState = useCallback((nextState: AppDataSnapshot) => {
    const results = [
      writeProfile(nextState.profile),
      writeTotalPoints(nextState.totalPoints),
      writePresets(nextState.presets),
      writeHistory(nextState.history),
      writeMetadata(nextState.metadata),
      writeRewards(nextState.rewards),
      writeSettings(nextState.settings),
      writeSyncSession(nextState.syncSession),
      writeMutationQueue(nextState.mutationQueue),
    ]

    const failedWrite = results.find((result) => !result.ok)
    setStorageMessage(failedWrite?.message ?? null)
  }, [])

  const commit = useCallback((updater: (currentState: AppDataSnapshot) => AppDataSnapshot) => {
    const nextState = updater(appStateRef.current)
    appStateRef.current = nextState
    setAppState(nextState)
    persistState(nextState)
  }, [persistState])

  const clearRetryTimer = useCallback(() => {
    if (syncRetryTimeoutRef.current) {
      window.clearTimeout(syncRetryTimeoutRef.current)
      syncRetryTimeoutRef.current = null
    }
  }, [])

  const scheduleRetry = useCallback((retryCount: number) => {
    clearRetryTimer()

    const retryDelay = Math.min(30_000, 2 ** Math.min(retryCount, 5) * 1_000)
    syncRetryTimeoutRef.current = window.setTimeout(() => {
      void syncNowRef.current()
    }, retryDelay)
  }, [clearRetryTimer])

  const syncNow = useCallback(async () => {
    const currentState = appStateRef.current

    if (
      currentState.syncSession.mode !== 'synced' ||
      !currentState.syncSession.deviceToken
    ) {
      return false
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      commit((state) => ({
        ...state,
        syncSession: updateLocalSyncSession(state.syncSession, {
          status: 'offline',
        }),
      }))
      return false
    }

    if (syncInFlightRef.current) {
      return false
    }

    syncInFlightRef.current = true

    commit((state) => ({
      ...state,
      syncSession: updateLocalSyncSession(state.syncSession, {
        lastError: null,
        status: 'syncing',
      }),
    }))

    try {
      const deviceToken = appStateRef.current.syncSession.deviceToken

      if (!deviceToken) {
        throw new Error('This device is not linked to a synced family.')
      }

      if (appStateRef.current.mutationQueue.length) {
        commit((state) => ({
          ...state,
          mutationQueue: markQueueAttempt(state.mutationQueue),
        }))

        const pushResponse = await pushSyncMutations(deviceToken, {
          mutations: appStateRef.current.mutationQueue,
        })

        commit((state) => ({
          ...state,
          mutationQueue: sanitizeMutationQueue(
            state.mutationQueue.filter(
              (mutation) => !pushResponse.acceptedMutationIds.includes(mutation.id),
            ),
          ),
          syncSession: updateLocalSyncSession(state.syncSession, {
            cursor: pushResponse.cursor,
          }),
        }))
      }

      const pullResponse = await pullSyncSnapshot(
        deviceToken,
        appStateRef.current.syncSession.cursor,
      )

      const nextSnapshot = pullResponse.snapshot

      if (pullResponse.changed && nextSnapshot) {
        commit((state) => ({
          ...mergeRemoteSnapshot(state, nextSnapshot),
          mutationQueue: state.mutationQueue,
        }))
      } else {
        commit((state) => ({
          ...state,
          syncSession: updateLocalSyncSession(state.syncSession, {
            lastError: null,
            lastSyncAt: new Date().toISOString(),
            retryCount: 0,
            status: 'synced',
          }),
        }))
      }

      const devicesResponse = await fetchLinkedDevices(deviceToken).catch(() => null)

      if (devicesResponse) {
        commit((state) => ({
          ...state,
          syncSession: updateLocalSyncSession(state.syncSession, {
            linkedDevices: devicesResponse.devices,
            primaryDeviceId:
              devicesResponse.devices.find((device) => device.isPrimary)?.id ?? null,
          }),
        }))
      }

      clearRetryTimer()
      return true
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Sync failed for this device.'
      const revoked = message.includes('no longer allowed')
      const nextRetryCount = appStateRef.current.syncSession.retryCount + 1

      commit((state) => ({
        ...state,
        syncSession: updateLocalSyncSession(state.syncSession, {
          lastError: message,
          retryCount: nextRetryCount,
          revokedAt: revoked ? new Date().toISOString() : state.syncSession.revokedAt,
          status: revoked
            ? 'revoked'
            : typeof navigator !== 'undefined' && !navigator.onLine
              ? 'offline'
              : 'error',
        }),
      }))
      setSyncMessage(message)

      if (!revoked) {
        scheduleRetry(nextRetryCount)
      }

      return false
    } finally {
      syncInFlightRef.current = false
    }
  }, [commit, clearRetryTimer, scheduleRetry])

  syncNowRef.current = syncNow

  useEffect(() => {
    if (appState.syncSession.mode !== 'synced') {
      return
    }

    void syncNow()
  }, [appState.syncSession.mode, syncNow])

  useEffect(() => {
    const handleOnline = () => {
      void syncNow()
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void syncNow()
      }
    }

    window.addEventListener('online', handleOnline)
    document.addEventListener('visibilitychange', handleVisibility)

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void syncNow()
      }
    }, 45_000)

    return () => {
      clearRetryTimer()
      window.removeEventListener('online', handleOnline)
      document.removeEventListener('visibilitychange', handleVisibility)
      window.clearInterval(intervalId)
    }
  }, [clearRetryTimer, syncNow])

  const exportSnapshot = () => {
    const exportedAt = new Date().toISOString()
    let exportedSnapshot: AppDataSnapshot | null = null

    commit((currentState) => {
      const nextMetadata = sanitizeMetadata({
        ...currentState.metadata,
        lastExportedAt: exportedAt,
        schemaVersion: DEFAULT_METADATA.schemaVersion,
      })
      const nextState = {
        ...currentState,
        metadata: nextMetadata,
      }

      exportedSnapshot = nextState

      return nextState
    })

    return {
      exportedAt,
      snapshot: exportedSnapshot ?? appStateRef.current,
    }
  }

  const importSnapshot = (
    nextSnapshot: AppDataSnapshot,
    importedSchemaVersion: number,
  ) => {
    const importedAt = new Date().toISOString()

    commit((currentState) => ({
      history: sanitizeHistory(nextSnapshot.history),
      metadata: sanitizeImportedMetadata(
        nextSnapshot.metadata,
        currentState.metadata,
        importedAt,
        importedSchemaVersion,
      ),
      mutationQueue: sanitizeMutationQueue(nextSnapshot.mutationQueue),
      presets: sanitizePresets(nextSnapshot.presets),
      profile: sanitizeProfile(nextSnapshot.profile),
      rewards: sanitizeRewards(nextSnapshot.rewards),
      settings: sanitizeSettings(nextSnapshot.settings),
      syncSession: sanitizeSyncSession(nextSnapshot.syncSession),
      totalPoints: sanitizeTotalPoints(nextSnapshot.totalPoints),
    }))
  }

  const setSharedSnapshot = (
    snapshot: SharedFamilySnapshot,
    deviceId: string,
    deviceToken: string,
  ) => {
    commit((currentState) => ({
      ...mergeRemoteSnapshot(currentState, snapshot),
      metadata: sanitizeMetadata({
        ...currentState.metadata,
        lastMigratedToSyncAt: new Date().toISOString(),
      }),
      mutationQueue: [],
      settings: sanitizeSettings({
        ...currentState.settings,
        hasCompletedSetup: true,
        hasSeenIntro: true,
      }),
      syncSession: updateLocalSyncSession(currentState.syncSession, {
        activePairingCode: snapshot.activePairingCode,
        cursor: snapshot.cursor,
        deviceId,
        deviceToken,
        familyId: snapshot.familyId,
        lastError: null,
        lastSyncAt: new Date().toISOString(),
        linkedDevices: snapshot.devices,
        mode: 'synced',
        pairedAt: new Date().toISOString(),
        primaryDeviceId: snapshot.devices.find((device) => device.isPrimary)?.id ?? null,
        retryCount: 0,
        revokedAt: null,
        status: 'synced',
      }),
      totalPoints: deriveTotalPoints(snapshot.history),
    }))
  }

  const createSyncedFamily = async (input: {
    deviceName: string
    parentName: string
    profile: Profile
  }): Promise<PairingCodeState> => {
    const localSettings = sanitizeSettings({
      ...appStateRef.current.settings,
      deviceName: input.deviceName,
      hasCompletedSetup: true,
      hasSeenIntro: true,
      parentDisplayName: input.parentName,
    })

    const nextSnapshot = {
      ...appStateRef.current,
      profile: sanitizeProfile(input.profile),
      settings: localSettings,
      totalPoints: deriveTotalPoints(appStateRef.current.history),
    }

    const response = await createFamily({
      deviceName: input.deviceName,
      parentName: input.parentName,
      snapshot: nextSnapshot,
    })

    setSharedSnapshot(response.snapshot, response.deviceId, response.deviceToken)
    if (!response.snapshot.activePairingCode) {
      throw new Error('A sync code could not be created for this family yet.')
    }

    return response.snapshot.activePairingCode
  }

  const joinSyncedFamily = async (input: JoinFamilyInput) => {
    const response = await redeemPairCode(input)

    commit((currentState) => ({
      ...currentState,
      settings: sanitizeSettings({
        ...currentState.settings,
        deviceName: input.deviceName,
        hasCompletedSetup: true,
        hasSeenIntro: true,
        parentDisplayName: input.parentName,
      }),
    }))
    setSharedSnapshot(response.snapshot, response.deviceId, response.deviceToken)
  }

  const completeSetup = (nextProfile: Profile) =>
    commit((currentState) => ({
      ...currentState,
      metadata: {
        ...currentState.metadata,
        schemaVersion: DEFAULT_METADATA.schemaVersion,
      },
      profile: sanitizeProfile(nextProfile),
      settings: {
        ...currentState.settings,
        hasCompletedSetup: true,
        hasSeenIntro: true,
      },
    }))

  const trackPoints = ({ amount, reason, type }: PointsActionInput) => {
    const cleanAmount = Math.max(1, Math.round(amount))
    const cleanReason = reason.trim() || (type === 'add' ? 'Bonus points' : 'Points taken away')
    const actorName = appStateRef.current.settings.parentDisplayName || 'Parent'
    const deviceId = appStateRef.current.syncSession.deviceId || 'local-device'
    const event = createPointEvent({
      actorName,
      amount: cleanAmount,
      deviceId,
      reason: cleanReason,
      type,
    })

    commit((currentState) => {
      const nextHistory = [event, ...currentState.history].slice(0, 500)
      const nextQueue =
        currentState.syncSession.mode === 'synced'
          ? [...currentState.mutationQueue, createQueuedPointMutation(event)]
          : currentState.mutationQueue

      return {
        ...currentState,
        history: nextHistory,
        mutationQueue: sanitizeMutationQueue(nextQueue),
        totalPoints: deriveTotalPoints(nextHistory),
      }
    })

    if (appStateRef.current.syncSession.mode === 'synced') {
      void syncNow()
    }
  }

  const resetPoints = () => {
    if (appStateRef.current.totalPoints < 1) {
      return
    }

    trackPoints({
      amount: appStateRef.current.totalPoints,
      reason: 'Parent reset points',
      type: 'remove',
    })
  }

  const saveProfile = (nextProfile: Profile) => {
    const updatedProfile = sanitizeProfile({
      ...nextProfile,
      updatedAt: new Date().toISOString(),
      updatedByDeviceId: appStateRef.current.syncSession.deviceId,
    })

    commit((currentState) => ({
      ...currentState,
      metadata: sanitizeMetadata(currentState.metadata),
      mutationQueue: sanitizeMutationQueue(
        currentState.syncSession.mode === 'synced'
          ? [...currentState.mutationQueue, createQueuedProfileMutation(updatedProfile)]
          : currentState.mutationQueue,
      ),
      profile: updatedProfile,
    }))

    if (appStateRef.current.syncSession.mode === 'synced') {
      void syncNow()
    }
  }

  const savePresets = (nextPresets: Presets) => {
    const updatedAt = new Date().toISOString()
    const deviceId = appStateRef.current.syncSession.deviceId
    const updatedPresets = sanitizePresets({
      add: nextPresets.add.map((preset, index) => ({
        ...preset,
        sortOrder: index,
        updatedAt,
        updatedByDeviceId: deviceId,
      })),
      remove: nextPresets.remove.map((preset, index) => ({
        ...preset,
        sortOrder: index,
        updatedAt,
        updatedByDeviceId: deviceId,
      })),
    })

    commit((currentState) => ({
      ...currentState,
      metadata: sanitizeMetadata(currentState.metadata),
      mutationQueue: sanitizeMutationQueue(
        currentState.syncSession.mode === 'synced'
          ? [...currentState.mutationQueue, createQueuedPresetsMutation(updatedPresets)]
          : currentState.mutationQueue,
      ),
      presets: updatedPresets,
    }))

    if (appStateRef.current.syncSession.mode === 'synced') {
      void syncNow()
    }
  }

  const saveRewards = useCallback((nextRewards: Reward[]) => {
    const updatedAt = new Date().toISOString()
    const deviceId = appStateRef.current.syncSession.deviceId
    const updatedRewards = sanitizeRewards(
      nextRewards.map((reward, index) => ({
        ...reward,
        sortOrder: index,
        updatedAt,
        updatedByDeviceId: deviceId,
      })),
    )

    commit((currentState) => ({
      ...currentState,
      metadata: sanitizeMetadata(currentState.metadata),
      mutationQueue: sanitizeMutationQueue(
        currentState.syncSession.mode === 'synced'
          ? [...currentState.mutationQueue, createQueuedRewardsMutation(updatedRewards)]
          : currentState.mutationQueue,
      ),
      rewards: updatedRewards,
    }))

    if (appStateRef.current.syncSession.mode === 'synced') {
      void syncNow()
    }
  }, [commit, syncNow])

  const updateReward = (
    rewardId: string,
    updater: (reward: Reward) => Reward,
  ) => {
    const nextRewards = appStateRef.current.rewards.map((reward) =>
      reward.id === rewardId ? updater(reward) : reward,
    )

    saveRewards(nextRewards)
  }

  const setRewardClaimed = (rewardId: string, isClaimed: boolean) => {
    updateReward(rewardId, (reward) => ({
      ...reward,
      claimedAt: isClaimed ? new Date().toISOString() : null,
      isClaimed,
    }))
  }

  useEffect(() => {
    if (activeRewardReveal) {
      return
    }

    const rewardToReveal = appState.rewards.find((reward) =>
      isRewardReadyToReveal(reward, appState.totalPoints),
    )

    if (!rewardToReveal) {
      return
    }

    const revealedAt = new Date().toISOString()
    const nextReward = {
      ...rewardToReveal,
      hasCelebratedUnlock: true,
      unlockedAt: rewardToReveal.unlockedAt ?? revealedAt,
    }

    setActiveRewardReveal(nextReward)
    saveRewards(
      appState.rewards.map((reward) => (reward.id === rewardToReveal.id ? nextReward : reward)),
    )
  }, [activeRewardReveal, appState.rewards, appState.totalPoints, saveRewards])

  return {
    activeRewardReveal,
    clearHistory: () =>
      commit((currentState) => {
        if (currentState.syncSession.mode === 'synced') {
          setSyncMessage('Shared history cannot be cleared while family sync is enabled.')
          return currentState
        }

        return {
          ...currentState,
          history: [],
          totalPoints: 0,
        }
      }),
    completeIntro: () =>
      commit((currentState) => ({
        ...currentState,
        metadata: {
          ...currentState.metadata,
          schemaVersion: DEFAULT_METADATA.schemaVersion,
        },
        settings: {
          ...currentState.settings,
          hasSeenIntro: true,
        },
      })),
    completeSetup,
    createSyncedFamily,
    exportSnapshot,
    generateSyncCode: async () => {
      const token = appStateRef.current.syncSession.deviceToken

      if (!token) {
        throw new Error('This device is not linked to a synced family.')
      }

      const response = await createPairCode(token)

      commit((currentState) => ({
        ...currentState,
        syncSession: updateLocalSyncSession(currentState.syncSession, {
          activePairingCode: response.pairingCode,
        }),
      }))

      return response.pairingCode
    },
    history: appState.history,
    importSnapshot,
    joinSyncedFamily,
    metadata: appState.metadata,
    mutationQueue: appState.mutationQueue,
    presets: appState.presets,
    profile: appState.profile,
    resetPoints,
    revokeLinkedDevice: async (deviceId: string) => {
      const token = appStateRef.current.syncSession.deviceToken

      if (!token) {
        throw new Error('This device is not linked to a synced family.')
      }

      const response = await revokeLinkedDevice(token, deviceId)

      commit((currentState) => ({
        ...currentState,
        syncSession: updateLocalSyncSession(currentState.syncSession, {
          linkedDevices: response.devices,
        }),
      }))
    },
    rewards: appState.rewards,
    saveAppSettings: (nextSettings: AppSettings) =>
      commit((currentState) => ({
        ...currentState,
        metadata: sanitizeMetadata(currentState.metadata),
        settings: sanitizeSettings(nextSettings),
      })),
    setRewardClaimed,
    setRewardRevealDismissed: () => setActiveRewardReveal(null),
    savePresets,
    saveProfile,
    saveRewards,
    settings: appState.settings,
    storageMessage,
    syncMessage,
    syncNow,
    syncSession: appState.syncSession,
    totalPoints: appState.totalPoints,
    trackPoints,
    upgradeToSyncedFamily: async (input: {
      presets: Presets
      profile: Profile
      rewards: Reward[]
      settings: AppSettings
    }) => {
      const nextProfile = sanitizeProfile(input.profile)
      const nextPresets = sanitizePresets(input.presets)
      const nextRewards = sanitizeRewards(input.rewards)
      const nextSettings = sanitizeSettings({
        ...input.settings,
        hasCompletedSetup: true,
        hasSeenIntro: true,
      })

      commit((currentState) => ({
        ...currentState,
        presets: nextPresets,
        profile: nextProfile,
        rewards: nextRewards,
        settings: nextSettings,
      }))

      const response = await createFamily({
        deviceName: nextSettings.deviceName || 'Phone',
        parentName: nextSettings.parentDisplayName || 'Parent',
        snapshot: {
          ...appStateRef.current,
          presets: nextPresets,
          profile: nextProfile,
          rewards: nextRewards,
          settings: nextSettings,
          totalPoints: deriveTotalPoints(appStateRef.current.history),
        },
      })
      setSharedSnapshot(response.snapshot, response.deviceId, response.deviceToken)

      const pairingCode = response.snapshot.activePairingCode

      if (!pairingCode) {
        throw new Error('A sync code could not be created for this family yet.')
      }

      commit((currentState) => ({
        ...currentState,
        metadata: sanitizeMetadata({
          ...currentState.metadata,
          lastMigratedToSyncAt: new Date().toISOString(),
        }),
      }))

      return pairingCode
    },
  }
}

const sanitizeImportedMetadata = (
  importedMetadata: AppMetadata,
  currentMetadata: AppMetadata,
  importedAt: string,
  importedSchemaVersion: number,
) =>
  sanitizeMetadata({
    ...currentMetadata,
    ...importedMetadata,
    lastImportedAt: importedAt,
    lastImportedSchemaVersion: importedSchemaVersion,
    schemaVersion: DEFAULT_METADATA.schemaVersion,
  })
