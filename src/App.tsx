import { useEffect, useState } from 'react'
import { ConfirmDialog } from './components/ConfirmDialog'
import { ParentGateModal } from './components/ParentGateModal'
import { PointsModal } from './components/PointsModal'
import { RewardDetailsSheet } from './components/RewardDetailsSheet'
import { RewardRevealOverlay } from './components/RewardRevealOverlay'
import { SplashScreen } from './components/SplashScreen'
import { useBestieApp } from './hooks/useBestieApp'
import {
  buildExportEnvelope,
  buildExportFilename,
  parseImportText,
} from './lib/backup'
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
    activeRewardReveal,
    exportSnapshot,
    generateSyncCode,
    history,
    importSnapshot,
    joinSyncedFamily,
    presets,
    profile,
    resetPoints,
    revokeLinkedDevice,
    rewards,
    saveAppSettings,
    savePresets,
    saveProfile,
    saveRewards,
    setRewardClaimed,
    setRewardRevealDismissed,
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
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null)
  const [transferError, setTransferError] = useState<string | null>(null)
  const [transferMessage, setTransferMessage] = useState<string | null>(null)

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
    if (!activeRewardReveal) {
      return
    }

    handleRequestOpenRewardDetails(activeRewardReveal)
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
      })
    }
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
              onToggleClaimed={handleToggleRewardClaimed}
              reward={selectedReward}
            />
          ) : null}

          {activeRewardReveal ? (
            <RewardRevealOverlay
              onClose={setRewardRevealDismissed}
              onOpenParentDetails={handleRequestOpenRewardDetailsFromReveal}
              reward={activeRewardReveal}
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
