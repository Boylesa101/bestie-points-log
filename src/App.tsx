import { useCallback, useEffect, useMemo, useState } from 'react'
import { ConfirmDialog } from './components/ConfirmDialog'
import { DailyReminderPrompt } from './components/DailyReminderPrompt'
import { ParentGateModal } from './components/ParentGateModal'
import { PointsModal } from './components/PointsModal'
import { RewardDetailsSheet } from './components/RewardDetailsSheet'
import { RewardRevealOverlay } from './components/RewardRevealOverlay'
import { SplashScreen } from './components/SplashScreen'
import { UpdatePrompt } from './components/UpdatePrompt'
import { useBestieApp } from './hooks/useBestieApp'
import {
  buildExportEnvelope,
  buildExportFilename,
  parseImportText,
} from './lib/backup'
import {
  applyPwaUpdate,
  subscribeToPwaUpdates,
} from './lib/pwa'
import {
  getDateKey,
  initializeReminderBridge,
  isNativeReminderPlatform,
  shouldShowWebReminderPrompt,
  subscribeToReminderIntent,
  syncReminderSchedule,
} from './lib/reminders'
import { playPointSound } from './lib/sound'
import type {
  AppSettings,
  PointActionType,
  PointsActionInput,
  Presets,
  Profile,
  Reward,
} from './types/app'
import { HistoryScreen } from './screens/HistoryScreen'
import { HomeScreen } from './screens/HomeScreen'
import { RewardsScreen } from './screens/RewardsScreen'
import { SetupScreen } from './screens/SetupScreen'
import { SettingsScreen } from './screens/SettingsScreen'

type Screen = 'home' | 'history' | 'rewards' | 'settings' | 'setup'

interface SettingsPayload {
  presets: Presets
  profile: Profile
  rewards: Reward[]
  settings: AppSettings
}

interface ConfirmState {
  action: () => void
  confirmLabel: string
  description: string
  tone?: 'danger' | 'primary'
  title: string
}

interface PointReactionState {
  id: number
  type: PointActionType
}

function App() {
  const {
    clearHistory,
    completeSetup,
    completeIntro,
    activeRewardCelebration,
    exportSnapshot,
    generateSyncCode,
    history,
    importSnapshot,
    joinSyncedFamily,
    markReminderShown,
    metadata,
    presets,
    profile,
    resetPoints,
    revokeLinkedDevice,
    rewards,
    saveAppSettings,
    savePresets,
    saveProfile,
    saveRewards,
    redeemReward,
    setRewardClaimed,
    setRewardCelebrationDismissed,
    setNotificationPermissionState,
    settings,
    storageMessage,
    syncMessage,
    syncNow,
    syncSession,
    totalPoints,
    trackPoints,
    upgradeToSyncedFamily,
    createSyncedFamily,
  } = useBestieApp()
  const [screen, setScreen] = useState<Screen>('home')
  const [showSplash, setShowSplash] = useState(true)
  const [isPointsModalOpen, setIsPointsModalOpen] = useState(false)
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null)
  const [isParentGateOpen, setIsParentGateOpen] = useState(false)
  const [parentGateTarget, setParentGateTarget] = useState<'reward-details' | 'settings' | null>(null)
  const [pointReaction, setPointReaction] = useState<PointReactionState | null>(null)
  const [rewardMessage, setRewardMessage] = useState<string | null>(null)
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null)
  const [transferError, setTransferError] = useState<string | null>(null)
  const [transferMessage, setTransferMessage] = useState<string | null>(null)
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false)
  const [hasDismissedUpdatePrompt, setHasDismissedUpdatePrompt] = useState(false)
  const [isDailyReminderOpen, setIsDailyReminderOpen] = useState(false)
  const [shouldOpenPointsFromReminder, setShouldOpenPointsFromReminder] = useState(false)

  const hasPointsToday = useMemo(() => {
    const today = getDateKey()
    return history.some((entry) => getDateKey(new Date(entry.timestamp)) === today)
  }, [history])

  useEffect(() => {
    if (!settings.hasSeenIntro) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setScreen(settings.hasCompletedSetup ? 'home' : 'setup')
      setShowSplash(false)
    }, 900)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [settings.hasCompletedSetup, settings.hasSeenIntro])

  useEffect(() => {
    const unsubscribe = subscribeToPwaUpdates(setIsUpdateAvailable)
    return unsubscribe
  }, [])

  useEffect(() => {
    void initializeReminderBridge()

    const unsubscribe = subscribeToReminderIntent(() => {
      setShouldOpenPointsFromReminder(true)
    })

    return unsubscribe
  }, [])

  useEffect(() => {
    let isCancelled = false

    const syncReminderPreferences = async () => {
      const result = await syncReminderSchedule({
        enabled: settings.reminderEnabled,
        time: settings.reminderTime,
      })

      if (!isCancelled) {
        setNotificationPermissionState(result.permissionState)
      }
    }

    void syncReminderPreferences()

    return () => {
      isCancelled = true
    }
  }, [
    setNotificationPermissionState,
    settings.reminderEnabled,
    settings.reminderTime,
  ])

  const openPointsEntryFromReminder = useCallback(() => {
    setScreen('home')
    setIsDailyReminderOpen(false)
    setIsPointsModalOpen(true)
    setShouldOpenPointsFromReminder(false)
  }, [])

  useEffect(() => {
    if (!shouldOpenPointsFromReminder || showSplash || !settings.hasCompletedSetup) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      openPointsEntryFromReminder()
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [
    openPointsEntryFromReminder,
    settings.hasCompletedSetup,
    shouldOpenPointsFromReminder,
    showSplash,
  ])

  const checkForDailyReminder = useCallback(() => {
    if (
      showSplash ||
      !settings.hasCompletedSetup ||
      !settings.reminderEnabled ||
      isNativeReminderPlatform() ||
      screen === 'setup' ||
      isPointsModalOpen ||
      activeRewardCelebration
    ) {
      return
    }

    const shouldShowReminder = shouldShowWebReminderPrompt({
      hasPointsToday,
      lastReminderShownDate: metadata.lastReminderShownDate,
      reminderEnabled: settings.reminderEnabled,
      reminderTime: settings.reminderTime,
    })

    if (!shouldShowReminder) {
      return
    }

    markReminderShown(getDateKey())
    setIsDailyReminderOpen(true)
  }, [
    activeRewardCelebration,
    hasPointsToday,
    isPointsModalOpen,
    markReminderShown,
    metadata.lastReminderShownDate,
    screen,
    settings.hasCompletedSetup,
    settings.reminderEnabled,
    settings.reminderTime,
    showSplash,
  ])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      checkForDailyReminder()
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [checkForDailyReminder])

  useEffect(() => {
    if (isNativeReminderPlatform()) {
      return
    }

    const handleFocus = () => {
      checkForDailyReminder()
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkForDailyReminder()
      }
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [checkForDailyReminder])

  useEffect(() => {
    if (!hasPointsToday) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setIsDailyReminderOpen(false)
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [hasPointsToday])

  const handleSplashContinue = () => {
    completeIntro()
    setScreen(settings.hasCompletedSetup ? 'home' : 'setup')
    setShowSplash(false)
  }

  const handlePresetTap = (
    label: string,
    points: number,
    type: PointActionType,
  ) => {
    handlePointsAction({
      amount: points,
      reason: label,
      type,
    })
  }

  const handleSaveSettings = ({ presets, profile, rewards, settings }: SettingsPayload) => {
    saveProfile(profile)
    savePresets(presets)
    saveRewards(rewards)
    saveAppSettings(settings)
    setTransferError(null)
    setScreen('home')
  }

  const handleExportData = () => {
    try {
      const { exportedAt, snapshot } = exportSnapshot()
      const exportEnvelope = buildExportEnvelope(snapshot, exportedAt)
      const blob = new Blob([JSON.stringify(exportEnvelope, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const downloadLink = document.createElement('a')
      downloadLink.href = url
      downloadLink.download = buildExportFilename(exportedAt)
      downloadLink.click()
      URL.revokeObjectURL(url)
      setTransferError(null)
      setTransferMessage('Backup exported to a JSON file on this device.')
    } catch {
      setTransferMessage(null)
      setTransferError('The backup could not be exported on this device.')
    }
  }

  const handleImportFile = async (file: File) => {
    try {
      const text = await file.text()
      const parsedImport = parseImportText(text)

      setTransferError(null)
      setTransferMessage(
        `Backup ready to import from schema v${parsedImport.importedSchemaVersion}.`,
      )
      setConfirmState({
        action: () => {
          importSnapshot(parsedImport.snapshot, parsedImport.importedSchemaVersion)
          setTransferError(null)
          setTransferMessage('Backup imported and saved to this device.')
          setConfirmState(null)
          setScreen(parsedImport.snapshot.settings.hasCompletedSetup ? 'home' : 'setup')
        },
        confirmLabel: 'Import backup',
        description:
          'This will overwrite the current local Bestie Points Log data on this device.',
        title: 'Import this backup file?',
        tone: 'danger',
      })
    } catch (error) {
      setTransferMessage(null)
      setTransferError(
        error instanceof Error ? error.message : 'That backup file could not be imported.',
      )
    }
  }

  const handlePointsAction = ({ amount, reason, type }: PointsActionInput) => {
    trackPoints({ amount, reason, type })
    void playPointSound(type, settings.soundEnabled)
    const reactionId = Date.now()
    setPointReaction({ id: reactionId, type })
    window.setTimeout(() => {
      setPointReaction((currentReaction) =>
        currentReaction?.id === reactionId ? null : currentReaction,
      )
    }, 900)
  }

  const showRewardMessage = (message: string) => {
    setRewardMessage(message)
    window.setTimeout(() => {
      setRewardMessage((currentMessage) => (currentMessage === message ? null : currentMessage))
    }, 2600)
  }

  const handleUpdateNow = async () => {
    try {
      await applyPwaUpdate()
    } catch {
      setRewardMessage('The update could not be applied right now.')
    }
  }

  const shouldRequireParentPin =
    settings.parentLock.enabled &&
    settings.parentLock.isLocked &&
    Boolean(settings.parentLock.pin)

  const handleRequestOpenSettings = () => {
    if (shouldRequireParentPin) {
      setParentGateTarget('settings')
      setIsParentGateOpen(true)
      return
    }

    setScreen('settings')
  }

  const handleRequestOpenRewardDetails = (reward: Reward) => {
    if (shouldRequireParentPin) {
      setSelectedReward(reward)
      setParentGateTarget('reward-details')
      setIsParentGateOpen(true)
      return
    }

    setSelectedReward(reward)
  }

  const handleRequestOpenRewardDetailsFromReveal = () => {
    if (!activeRewardCelebration) {
      return
    }

    handleRequestOpenRewardDetails(activeRewardCelebration.reward)
  }

  const handleParentGateSuccess = () => {
    if (parentGateTarget === 'settings') {
      setScreen('settings')
    }

    if (parentGateTarget === 'reward-details' && selectedReward) {
      setSelectedReward(selectedReward)
    }
  }

  const handleEditRewardFromDetails = () => {
    setSelectedReward(null)
    handleRequestOpenSettings()
  }

  const handleToggleRewardClaimed = (rewardId: string, isClaimed: boolean) => {
    setRewardClaimed(rewardId, isClaimed)

    if (selectedReward?.id === rewardId) {
      setSelectedReward({
        ...selectedReward,
        claimedAt: isClaimed ? new Date().toISOString() : null,
        isClaimed,
        redeemedAt: isClaimed ? new Date().toISOString() : null,
      })
    }
  }

  const handleRequestRedeemReward = (reward: Reward) => {
    setConfirmState({
      action: () => {
        const result = redeemReward(reward.id)

        if (!result.ok) {
          showRewardMessage(result.message)
        } else {
          setSelectedReward(null)
          showRewardMessage(`${result.rewardTitle} redeemed!`)
        }

        setConfirmState(null)
      },
      confirmLabel: 'Redeem reward',
      description:
        reward.redemptionType === 'unlock-only'
          ? `Redeem ${reward.title} now?`
          : `Redeem ${reward.title} for ${reward.costPoints} Bestie Points?`,
      title: `Redeem ${reward.title}?`,
      tone: 'primary',
    })
  }

  const recentEntries = history.slice(0, 3)

  return (
    <div className="app-shell">
      {showSplash ? (
        <SplashScreen
          isFirstLaunch={!settings.hasSeenIntro}
          soundEnabled={settings.soundEnabled}
          onStart={handleSplashContinue}
        />
      ) : (
        <div className="mobile-shell">
          <div className="mobile-shell__glow mobile-shell__glow--top" />
          <div className="mobile-shell__glow mobile-shell__glow--bottom" />

          {storageMessage ? (
            <div className="storage-banner" role="status">
              {storageMessage}
            </div>
          ) : null}

          {syncMessage ? (
            <div className="storage-banner storage-banner--sync" role="status">
              {syncMessage}
            </div>
          ) : null}

          {rewardMessage ? (
            <div className="storage-banner storage-banner--reward" role="status">
              {rewardMessage}
            </div>
          ) : null}

          {screen === 'home' ? (
            <HomeScreen
              history={recentEntries}
              onOpenHistory={() => setScreen('history')}
              onOpenPointsModal={() => setIsPointsModalOpen(true)}
              onOpenRewards={() => setScreen('rewards')}
              onOpenSettings={handleRequestOpenSettings}
              onPresetTap={handlePresetTap}
              presets={presets}
              profile={profile}
              rewards={rewards}
              syncSession={syncSession}
              totalPoints={totalPoints}
            />
          ) : null}

          {screen === 'setup' ? (
            <SetupScreen
              defaultDeviceName={settings.deviceName}
              defaultParentName={settings.parentDisplayName}
              onCompleteLocal={(profile) => {
                completeSetup(profile)
                setScreen('home')
              }}
              onCreateSynced={createSyncedFamily}
              onFinishSyncedSetup={() => setScreen('home')}
              onJoinSynced={joinSyncedFamily}
              profile={profile}
            />
          ) : null}

          {screen === 'history' ? (
            <HistoryScreen entries={history} onBack={() => setScreen('home')} />
          ) : null}

          {screen === 'rewards' ? (
            <RewardsScreen
              onBack={() => setScreen('home')}
              onOpenParentDetails={handleRequestOpenRewardDetails}
              onRedeemReward={handleRequestRedeemReward}
              onOpenSettings={handleRequestOpenSettings}
              rewards={rewards}
              totalPoints={totalPoints}
            />
          ) : null}

          {screen === 'settings' ? (
            <SettingsScreen
              isActive={screen === 'settings'}
              onBack={() => setScreen('home')}
              onRequestClearHistory={() =>
                setConfirmState({
                  action: () => {
                    clearHistory()
                    setConfirmState(null)
                    setScreen('home')
                  },
                  confirmLabel: 'Clear history',
                  description:
                    'All activity entries will be removed from this device.',
                  title: 'Clear the activity history?',
                  tone: 'danger',
                })
              }
              onRequestResetPoints={() =>
                setConfirmState({
                  action: () => {
                    resetPoints()
                    setConfirmState(null)
                    setScreen('home')
                  },
                  confirmLabel: 'Reset points',
                  description:
                    'The current total will go back to zero, but history stays unless you clear it too.',
                  title: 'Reset Henry’s points?',
                  tone: 'danger',
                })
              }
              onSave={handleSaveSettings}
              onExportData={handleExportData}
              onImportFile={handleImportFile}
              presets={presets}
              profile={profile}
              rewards={rewards}
              settings={settings}
              metadata={metadata}
              syncSession={syncSession}
              onCreateSyncCode={generateSyncCode}
              onRevokeLinkedDevice={revokeLinkedDevice}
              onSyncNow={syncNow}
              onUpgradeToSync={upgradeToSyncedFamily}
              transferError={transferError}
              transferMessage={transferMessage}
            />
          ) : null}

          {isPointsModalOpen ? (
            <PointsModal
              onClose={() => setIsPointsModalOpen(false)}
              onSave={({ amount, reason, type }) => {
                handlePointsAction({ amount, reason, type })
                setIsPointsModalOpen(false)
              }}
            />
          ) : null}

          {selectedReward ? (
            <RewardDetailsSheet
              onClose={() => setSelectedReward(null)}
              onEditInSettings={handleEditRewardFromDetails}
              onRedeem={handleRequestRedeemReward}
              onToggleClaimed={handleToggleRewardClaimed}
              reward={selectedReward}
              totalPoints={totalPoints}
            />
          ) : null}

          {activeRewardCelebration ? (
            <RewardRevealOverlay
              mode={activeRewardCelebration.mode}
              onClose={setRewardCelebrationDismissed}
              onOpenParentDetails={handleRequestOpenRewardDetailsFromReveal}
              reward={activeRewardCelebration.reward}
              soundEnabled={settings.soundEnabled}
            />
          ) : null}

          {isParentGateOpen ? (
            <ParentGateModal
              onClose={() => {
                setIsParentGateOpen(false)
                setParentGateTarget(null)
              }}
              onUnlock={(pin) => {
                const isMatch = pin === settings.parentLock.pin

                if (isMatch) {
                  setIsParentGateOpen(false)
                  handleParentGateSuccess()
                  setParentGateTarget(null)
                }

                return isMatch
              }}
            />
          ) : null}

          <ConfirmDialog
            confirmLabel={confirmState?.confirmLabel ?? 'Confirm'}
            description={confirmState?.description ?? ''}
            onCancel={() => setConfirmState(null)}
            onConfirm={() => {
              confirmState?.action()
            }}
            open={Boolean(confirmState)}
            title={confirmState?.title ?? ''}
            tone={confirmState?.tone}
          />

          <UpdatePrompt
            onConfirm={() => {
              void handleUpdateNow()
            }}
            onDismiss={() => setHasDismissedUpdatePrompt(true)}
            open={isUpdateAvailable && !hasDismissedUpdatePrompt}
          />

          <DailyReminderPrompt
            onAddPointsNow={openPointsEntryFromReminder}
            onDismiss={() => setIsDailyReminderOpen(false)}
            open={isDailyReminderOpen}
          />

          {pointReaction ? (
            <div
              className={`point-reaction point-reaction--${pointReaction.type}`}
              key={pointReaction.id}
            >
              <div className="point-reaction__icon">
                {pointReaction.type === 'add' ? '⭐' : '☁️'}
              </div>
              <div className="point-reaction__text">
                {pointReaction.type === 'add' ? 'Yay!' : 'Aww'}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
  }

export default App
