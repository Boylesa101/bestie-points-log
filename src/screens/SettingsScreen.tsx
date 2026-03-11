import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { DEFAULT_PROFILE, sanitizePresets, sanitizeProfile, sanitizeRewards } from '../lib/defaults'
import { getPresetIcon } from '../lib/icons'
import { prepareImageDataUrl } from '../lib/images'
import { DAY_OUT_PLACE_OPTIONS, getRewardCategoryIcon } from '../lib/rewards'
import { LinkedDevicesList } from '../components/LinkedDevicesList'
import { SyncStatus } from '../components/SyncStatus'
import type {
  AppSettings,
  PairingCodeState,
  PresetAction,
  Presets,
  Profile,
  RewardCategory,
  Reward,
  SyncSession,
} from '../types/app'

interface SettingsPayload {
  presets: Presets
  profile: Profile
  rewards: Reward[]
  settings: AppSettings
}

interface SettingsScreenProps {
  isActive: boolean
  onBack: () => void
  onCreateSyncCode: () => Promise<PairingCodeState>
  onRequestClearHistory: () => void
  onExportData: () => void
  onImportFile: (file: File) => void
  onRequestResetPoints: () => void
  onRevokeLinkedDevice: (deviceId: string) => Promise<void>
  onSave: (payload: SettingsPayload) => void
  onSyncNow: () => Promise<boolean>
  onUpgradeToSync: (payload: SettingsPayload) => Promise<PairingCodeState>
  presets: Presets
  profile: Profile
  rewards: Reward[]
  settings: AppSettings
  syncSession: SyncSession
  transferError: string | null
  transferMessage: string | null
}

export const SettingsScreen = ({
  isActive,
  onBack,
  onCreateSyncCode,
  onRequestClearHistory,
  onExportData,
  onImportFile,
  onRequestResetPoints,
  onRevokeLinkedDevice,
  onSave,
  onSyncNow,
  onUpgradeToSync,
  presets,
  profile,
  rewards,
  settings,
  syncSession,
  transferError,
  transferMessage,
}: SettingsScreenProps) => {
  const [childName, setChildName] = useState(profile.childName)
  const [photoDataUrl, setPhotoDataUrl] = useState(profile.photoDataUrl)
  const [addPresets, setAddPresets] = useState(presets.add)
  const [removePresets, setRemovePresets] = useState(presets.remove)
  const [rewardDrafts, setRewardDrafts] = useState(rewards)
  const [soundEnabled, setSoundEnabled] = useState(settings.soundEnabled)
  const [lockActive, setLockActive] = useState(settings.parentLock.isLocked)
  const [parentDisplayName, setParentDisplayName] = useState(settings.parentDisplayName)
  const [deviceName, setDeviceName] = useState(settings.deviceName)
  const [pinDraft, setPinDraft] = useState('')
  const [confirmPinDraft, setConfirmPinDraft] = useState('')
  const [isChangingPin, setIsChangingPin] = useState(!settings.parentLock.pin)
  const [shouldRemovePin, setShouldRemovePin] = useState(false)
  const [error, setError] = useState('')
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false)
  const [isWorkingOnSync, setIsWorkingOnSync] = useState(false)
  const [syncNotice, setSyncNotice] = useState<string | null>(null)
  const [activePairingCode, setActivePairingCode] = useState<PairingCodeState | null>(
    syncSession.activePairingCode,
  )
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const importInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!isActive) {
      return
    }

    setChildName(profile.childName)
    setPhotoDataUrl(profile.photoDataUrl)
    setAddPresets(presets.add)
    setRemovePresets(presets.remove)
    setRewardDrafts(rewards)
    setSoundEnabled(settings.soundEnabled)
    setLockActive(settings.parentLock.isLocked)
    setParentDisplayName(settings.parentDisplayName)
    setDeviceName(settings.deviceName)
    setPinDraft('')
    setConfirmPinDraft('')
    setIsChangingPin(!settings.parentLock.pin)
    setShouldRemovePin(false)
    setError('')
    setIsProcessingPhoto(false)
    setIsWorkingOnSync(false)
    setSyncNotice(null)
    setActivePairingCode(syncSession.activePairingCode)
  }, [isActive, presets, profile, rewards, settings, syncSession.activePairingCode])

  const updatePreset = (
    group: 'add' | 'remove',
    id: string,
    field: 'icon' | 'label' | 'points' | 'visibleOnHome',
    value: boolean | string,
  ) => {
    const setter = group === 'add' ? setAddPresets : setRemovePresets

    setter((currentPresets) =>
      currentPresets.map((preset) =>
        preset.id === id
          ? {
              ...preset,
              [field]:
                field === 'points'
                  ? Number.parseInt(String(value) || '0', 10) || 0
                  : field === 'visibleOnHome'
                    ? Boolean(value)
                    : value,
            }
          : preset,
      ),
    )
  }

  const addPreset = (group: 'add' | 'remove') => {
    const setter = group === 'add' ? setAddPresets : setRemovePresets

    setter((currentPresets) => [
      ...reorderPresets(currentPresets),
      createPresetDraft(group, currentPresets.length),
    ])
  }

  const removePreset = (group: 'add' | 'remove', id: string) => {
    const setter = group === 'add' ? setAddPresets : setRemovePresets
    setter((currentPresets) =>
      reorderPresets(currentPresets.filter((preset) => preset.id !== id)),
    )
  }

  const movePreset = (
    group: 'add' | 'remove',
    id: string,
    direction: 'down' | 'up',
  ) => {
    const setter = group === 'add' ? setAddPresets : setRemovePresets

    setter((currentPresets) => {
      const nextPresets = [...currentPresets]
      const currentIndex = nextPresets.findIndex((preset) => preset.id === id)

      if (currentIndex < 0) {
        return currentPresets
      }

      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1

      if (targetIndex < 0 || targetIndex >= nextPresets.length) {
        return currentPresets
      }

      const [movedPreset] = nextPresets.splice(currentIndex, 1)
      nextPresets.splice(targetIndex, 0, movedPreset)

      return reorderPresets(nextPresets)
    })
  }

  const updateReward = (
    id: string,
    field:
      | 'bookingUrl'
      | 'category'
      | 'description'
      | 'discountCode'
      | 'eligibilityNotes'
      | 'icon'
      | 'lastCheckedAt'
      | 'costPoints'
      | 'milestone'
      | 'offerSource'
      | 'redemptionType'
      | 'title'
      | 'venueName'
      | 'venueTemplate',
    value: string,
  ) => {
    setRewardDrafts((currentRewards) =>
      currentRewards.map((reward) =>
        reward.id === id
          ? {
              ...reward,
              [field]:
                field === 'milestone' || field === 'costPoints'
                  ? Number.parseInt(value || '0', 10) || 0
                  : field === 'category'
                    ? (value as RewardCategory)
                  : value,
            }
          : reward,
      ),
    )
  }

  const updateRewardToggle = (
    id: string,
    field: 'isClaimed' | 'visibleBeforeUnlock',
    value: boolean,
  ) => {
    setRewardDrafts((currentRewards) =>
      currentRewards.map((reward) =>
        reward.id === id
          ? {
              ...reward,
              [field]: value,
              claimedAt:
                field === 'isClaimed'
                  ? value
                    ? reward.claimedAt ?? new Date().toISOString()
                    : null
                  : reward.claimedAt,
            }
          : reward,
      ),
    )
  }

  const toggleRewardClaim = (id: string) => {
    setRewardDrafts((currentRewards) =>
      currentRewards.map((reward) =>
        reward.id === id
          ? {
              ...reward,
              claimedAt: reward.isClaimed ? null : new Date().toISOString(),
              isClaimed: !reward.isClaimed,
            }
          : reward,
      ),
    )
  }

  const addReward = () => {
    setRewardDrafts((currentRewards) => [
      ...currentRewards,
      createRewardDraft(),
    ])
  }

  const removeReward = (id: string) => {
    setRewardDrafts((currentRewards) =>
      currentRewards.filter((reward) => reward.id !== id),
    )
  }

  const handlePhotoPick = async (event: ChangeEvent<HTMLInputElement>) => {
    const [file] = event.target.files ?? []

    if (!file) {
      return
    }

    setIsProcessingPhoto(true)
    setError('')

    try {
      const nextPhotoDataUrl = await prepareImageDataUrl(file)
      setPhotoDataUrl(nextPhotoDataUrl)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'The photo could not be saved.')
    } finally {
      event.target.value = ''
      setIsProcessingPhoto(false)
    }
  }

  const handleImportPick = (event: ChangeEvent<HTMLInputElement>) => {
    const [file] = event.target.files ?? []

    if (file) {
      onImportFile(file)
    }

    event.target.value = ''
  }

  const buildNextPayload = (): SettingsPayload | null => {
    const nextProfile = sanitizeProfile({
      childName: childName.trim() || DEFAULT_PROFILE.childName,
      photoDataUrl,
      photoKey: profile.photoKey,
      updatedAt: profile.updatedAt,
      updatedByDeviceId: profile.updatedByDeviceId,
    })
    const nextPresets = sanitizePresets({
      add: addPresets,
      remove: removePresets,
    })
    const nextRewards = sanitizeRewards(rewardDrafts)
    const hasExistingPin = Boolean(settings.parentLock.pin)
    const wantsNewPin = !shouldRemovePin && (isChangingPin || !hasExistingPin)
    const hasDraftPin = pinDraft.trim().length > 0 || confirmPinDraft.trim().length > 0

    if (wantsNewPin || hasDraftPin) {
      if (!/^\d{4,8}$/.test(pinDraft.trim())) {
        setError('Use a parent PIN with 4 to 8 digits.')
        return null
      }

      if (pinDraft.trim() !== confirmPinDraft.trim()) {
        setError('The new PIN and confirm PIN must match.')
        return null
      }
    }

    if (!nextProfile.childName.trim()) {
      setError('Add a child name before saving.')
      return null
    }

    const nextPin =
      shouldRemovePin
        ? null
        : wantsNewPin
          ? pinDraft.trim()
          : settings.parentLock.pin

    const nextSettings: AppSettings = {
      ...settings,
      deviceName: deviceName.trim(),
      parentDisplayName: parentDisplayName.trim() || 'Parent',
      parentLock: {
        enabled: Boolean(nextPin),
        isLocked: nextPin ? lockActive : false,
        pin: nextPin,
      },
      soundEnabled,
    }

    setError('')

    return {
      presets: nextPresets,
      profile: nextProfile,
      rewards: nextRewards,
      settings: nextSettings,
    }
  }

  const handleSave = () => {
    const payload = buildNextPayload()

    if (!payload) {
      return
    }

    onSave(payload)
  }

  const handleUpgradeToSync = async () => {
    const payload = buildNextPayload()

    if (!payload) {
      return
    }

    setIsWorkingOnSync(true)
    setSyncNotice(null)

    try {
      const pairingCode = await onUpgradeToSync(payload)
      setActivePairingCode(pairingCode)
      setSyncNotice('Family sync is ready. Use this code on the second phone to join.')
    } catch (syncError) {
      setError(
        syncError instanceof Error
          ? syncError.message
          : 'Family sync could not be started on this device.',
      )
    } finally {
      setIsWorkingOnSync(false)
    }
  }

  const handleCreateSyncCode = async () => {
    setIsWorkingOnSync(true)
    setError('')
    setSyncNotice(null)

    try {
      const pairingCode = await onCreateSyncCode()
      setActivePairingCode(pairingCode)
      setSyncNotice('A fresh sync code is ready for the next parent phone.')
    } catch (syncError) {
      setError(
        syncError instanceof Error
          ? syncError.message
          : 'A new sync code could not be created right now.',
      )
    } finally {
      setIsWorkingOnSync(false)
    }
  }

  const handleCopyCode = async () => {
    if (!activePairingCode) {
      return
    }

    try {
      await navigator.clipboard.writeText(activePairingCode.code)
      setSyncNotice('Sync code copied to the clipboard.')
    } catch {
      setSyncNotice(`Sync code: ${activePairingCode.code}`)
    }
  }

  const handleSyncNow = async () => {
    setIsWorkingOnSync(true)
    setError('')

    try {
      const didSync = await onSyncNow()
      setSyncNotice(didSync ? 'Shared family data checked and updated.' : 'Sync is waiting for a connection.')
    } catch (syncError) {
      setError(
        syncError instanceof Error ? syncError.message : 'Sync could not finish right now.',
      )
    } finally {
      setIsWorkingOnSync(false)
    }
  }

  const handleRevokeDevice = async (deviceId: string) => {
    setIsWorkingOnSync(true)
    setError('')

    try {
      await onRevokeLinkedDevice(deviceId)
      setSyncNotice('That device has been revoked and can no longer sync.')
    } catch (syncError) {
      setError(
        syncError instanceof Error ? syncError.message : 'That device could not be revoked.',
      )
    } finally {
      setIsWorkingOnSync(false)
    }
  }

  return (
    <main className="screen">
      <header className="subscreen__header">
        <div>
          <p className="subscreen__eyebrow">Parent tools</p>
          <h1 className="subscreen__title">Settings</h1>
          <p className="subscreen__lead">
            Edit {profile.childName}’s profile, presets, rewards, and storage controls.
          </p>
        </div>

        <button className="back-button" onClick={onBack} type="button">
          ←
        </button>
      </header>

      <div className="settings-stack">
        <section className="settings-card">
          <div className="settings-card__header">
            <h3>Profile setup</h3>
            <div className="chip">👨‍👩‍👧 Parent only</div>
          </div>

          <label className="field">
            <span className="field-label">Child name</span>
            <input
              className="text-input"
              maxLength={40}
              onChange={(event) => setChildName(event.target.value)}
              placeholder="Henry"
              value={childName}
            />
          </label>

          <div className="avatar-editor">
            <div className="avatar">
              {photoDataUrl ? (
                <img alt={childName || 'Child photo'} src={photoDataUrl} />
              ) : (
                <div className="avatar__placeholder">
                  <span>{(childName || 'H').charAt(0).toUpperCase()}</span>
                  <span className="avatar__sparkle">🪄</span>
                </div>
              )}
            </div>

            <div className="avatar-editor__buttons">
              <button
                className="inline-button"
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                {photoDataUrl ? 'Change photo' : 'Upload photo'}
              </button>
              <button
                className="soft-button"
                onClick={() => setPhotoDataUrl(null)}
                type="button"
              >
                Use placeholder avatar
              </button>
              <p className="field__help">
                {isProcessingPhoto ? 'Resizing photo...' : 'Photo is resized before it is stored locally.'}
              </p>
            </div>
          </div>

          <input
            accept="image/*"
            className="hidden-input"
            onChange={handlePhotoPick}
            ref={fileInputRef}
            type="file"
          />
        </section>

        <section className="settings-card">
          <div className="settings-card__header">
            <h3>This device</h3>
            <div className="chip">📱 Parent side</div>
          </div>

          <div className="editor-list">
            <label className="field">
              <span className="field-label">Parent display name</span>
              <input
                className="text-input"
                maxLength={40}
                onChange={(event) => setParentDisplayName(event.target.value)}
                placeholder="Mum"
                value={parentDisplayName}
              />
              <p className="field__help">
                Used on new activity from this phone, like “Dad added +50”.
              </p>
            </label>

            <label className="field">
              <span className="field-label">Device name</span>
              <input
                className="text-input"
                maxLength={40}
                onChange={(event) => setDeviceName(event.target.value)}
                placeholder="Dad&apos;s phone"
                value={deviceName}
              />
              <p className="field__help">
                Helps you tell linked devices apart later.
              </p>
            </label>
          </div>

          <label className="toggle-row toggle-row--card">
            <input
              checked={soundEnabled}
              onChange={(event) => setSoundEnabled(event.target.checked)}
              type="checkbox"
            />
            <span>Play cheerful sounds for points</span>
          </label>

          <p className="field__help">
            Sounds are soft, local, and safe to mute. If a browser blocks playback, the app keeps
            working without errors.
          </p>

          {settings.parentLock.pin && !shouldRemovePin ? (
            <>
              <label className="toggle-row toggle-row--card">
                <input
                  checked={lockActive}
                  onChange={(event) => setLockActive(event.target.checked)}
                  type="checkbox"
                />
                <span>Require PIN before opening settings</span>
              </label>

              <div className="actions-row actions-row--stack">
                <button
                  className="inline-button"
                  onClick={() => {
                    setIsChangingPin((current) => !current)
                    setPinDraft('')
                    setConfirmPinDraft('')
                    setShouldRemovePin(false)
                    setError('')
                  }}
                  type="button"
                >
                  {isChangingPin ? 'Keep current PIN' : 'Change PIN'}
                </button>
                <button
                  className="danger-button"
                  onClick={() => {
                    setShouldRemovePin(true)
                    setLockActive(false)
                    setIsChangingPin(false)
                    setPinDraft('')
                    setConfirmPinDraft('')
                    setError('')
                  }}
                  type="button"
                >
                  Remove PIN
                </button>
              </div>
            </>
          ) : (
            <p className="field__help">
              Create a PIN to protect the settings area on this device.
            </p>
          )}

          {shouldRemovePin ? (
            <p className="field__help">
              PIN lock will be removed when you save settings.
            </p>
          ) : null}

          {!shouldRemovePin && (isChangingPin || !settings.parentLock.pin) ? (
            <div className="pin-fields">
              <label className="field">
                <span className="field-label">Parent PIN</span>
                <input
                  autoComplete="off"
                  className="number-input"
                  inputMode="numeric"
                  maxLength={8}
                  onChange={(event) => setPinDraft(event.target.value)}
                  placeholder="4-8 digits"
                  type="password"
                  value={pinDraft}
                />
              </label>

              <label className="field">
                <span className="field-label">Confirm PIN</span>
                <input
                  autoComplete="off"
                  className="number-input"
                  inputMode="numeric"
                  maxLength={8}
                  onChange={(event) => setConfirmPinDraft(event.target.value)}
                  placeholder="Repeat PIN"
                  type="password"
                  value={confirmPinDraft}
                />
              </label>
            </div>
          ) : null}

          <p className="field__help">
            Forgot the PIN later? Because the app is local-only, the recovery path is clearing this
            app&apos;s stored browser data on that device.
          </p>
        </section>

        <section className="settings-card">
          <div className="settings-card__header">
            <h3>Family sync</h3>
            <div className="chip">
              {syncSession.mode === 'synced' ? '☁️ Shared family' : '🏠 Local only'}
            </div>
          </div>

          <div className="sync-settings">
            <SyncStatus syncSession={syncSession} />
            <p className="field__help">
              {syncSession.mode === 'synced'
                ? 'Shared items: child profile, presets, rewards, activity history, and total points. Device-only items stay on this phone.'
                : 'Upgrade this log when you want two parent phones to share the same child profile, points, history, presets, and rewards.'}
            </p>

            {syncSession.mode === 'synced' ? (
              <>
                <div className="actions-row">
                  <button
                    className="inline-button"
                    disabled={isWorkingOnSync}
                    onClick={() => {
                      void handleSyncNow()
                    }}
                    type="button"
                  >
                    Sync now
                  </button>
                  <button
                    className="inline-button"
                    disabled={isWorkingOnSync}
                    onClick={() => {
                      void handleCreateSyncCode()
                    }}
                    type="button"
                  >
                    New sync code
                  </button>
                </div>

                {activePairingCode ? (
                  <div className="pair-code-card">
                    <p className="field-label">Current join code</p>
                    <div className="pair-code-card__code">{activePairingCode.code}</div>
                    <p className="field__help">
                      Expires {new Date(activePairingCode.expiresAt).toLocaleTimeString()}.
                    </p>
                    <button className="soft-button" onClick={() => void handleCopyCode()} type="button">
                      Copy code
                    </button>
                  </div>
                ) : null}

                <div className="settings-card__header settings-card__header--subsection">
                  <h3>Linked devices</h3>
                  <div className="chip">👨‍👩‍👧‍👦 Family</div>
                </div>

                <LinkedDevicesList
                  devices={syncSession.linkedDevices}
                  onRevoke={(deviceId) => {
                    void handleRevokeDevice(deviceId)
                  }}
                  primaryDeviceId={syncSession.primaryDeviceId}
                />
              </>
            ) : (
              <div className="sync-upgrade-card">
                <p className="field__help">
                  Save your latest profile changes and create a family log in the cloud for the
                  second phone to join with a short code.
                </p>
                <button
                  className="inline-button"
                  disabled={isWorkingOnSync}
                  onClick={() => {
                    void handleUpgradeToSync()
                  }}
                  type="button"
                >
                  Upgrade this log to synced family mode
                </button>

                {activePairingCode ? (
                  <div className="pair-code-card">
                    <p className="field-label">Join code</p>
                    <div className="pair-code-card__code">{activePairingCode.code}</div>
                    <p className="field__help">
                      Expires {new Date(activePairingCode.expiresAt).toLocaleTimeString()}.
                    </p>
                    <button className="soft-button" onClick={() => void handleCopyCode()} type="button">
                      Copy code
                    </button>
                  </div>
                ) : null}
              </div>
            )}

            {syncNotice ? <p className="success-text">{syncNotice}</p> : null}
          </div>
        </section>

        <section className="settings-card">
          <div className="settings-card__header">
            <h3>Win point presets</h3>
            <button className="inline-button" onClick={() => addPreset('add')} type="button">
              Add preset
            </button>
          </div>

          <div className="editor-list">
            {addPresets.map((preset) => (
              <div className="editor-row editor-row--preset" key={preset.id}>
                <div className="editor-row__top">
                  <div className="preset-editor__title">
                    <span className="preset-editor__icon">
                      {getPresetIcon(preset, 'add')}
                    </span>
                    <div>
                      <strong>{preset.label || 'Preset'}</strong>
                      <p className="field__help">
                        {preset.source === 'default' ? 'Default preset' : 'Custom preset'}
                      </p>
                    </div>
                  </div>
                  <div className="preset-editor__actions">
                    <button
                      className="inline-button inline-button--tiny"
                      onClick={() => movePreset('add', preset.id, 'up')}
                      type="button"
                    >
                      ↑
                    </button>
                    <button
                      className="inline-button inline-button--tiny"
                      onClick={() => movePreset('add', preset.id, 'down')}
                      type="button"
                    >
                      ↓
                    </button>
                    <button
                      className="danger-button danger-button--tiny"
                      onClick={() => removePreset('add', preset.id)}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <label className="field">
                  <input
                    className="text-input"
                    onChange={(event) =>
                      updatePreset('add', preset.id, 'label', event.target.value)
                    }
                    value={preset.label}
                  />
                </label>

                <div className="editor-row__fields editor-row__fields--preset">
                  <input
                    className="number-input"
                    min="1"
                    onChange={(event) =>
                      updatePreset('add', preset.id, 'points', event.target.value)
                    }
                    type="number"
                    value={preset.points}
                  />
                  <input
                    className="text-input text-input--icon"
                    inputMode="text"
                    maxLength={8}
                    onChange={(event) =>
                      updatePreset('add', preset.id, 'icon', event.target.value)
                    }
                    placeholder="⭐"
                    value={preset.icon ?? ''}
                  />
                </div>

                <label className="toggle-row">
                  <input
                    checked={preset.visibleOnHome}
                    onChange={(event) =>
                      updatePreset('add', preset.id, 'visibleOnHome', event.target.checked)
                    }
                    type="checkbox"
                  />
                  <span>Show this preset on the home screen</span>
                </label>
              </div>
            ))}
          </div>
        </section>

        <section className="settings-card">
          <div className="settings-card__header">
            <h3>Lose point presets</h3>
            <button className="inline-button" onClick={() => addPreset('remove')} type="button">
              Add preset
            </button>
          </div>

          <div className="editor-list">
            {removePresets.map((preset) => (
              <div className="editor-row editor-row--preset" key={preset.id}>
                <div className="editor-row__top">
                  <div className="preset-editor__title">
                    <span className="preset-editor__icon">
                      {getPresetIcon(preset, 'remove')}
                    </span>
                    <div>
                      <strong>{preset.label || 'Preset'}</strong>
                      <p className="field__help">
                        {preset.source === 'default' ? 'Default preset' : 'Custom preset'}
                      </p>
                    </div>
                  </div>
                  <div className="preset-editor__actions">
                    <button
                      className="inline-button inline-button--tiny"
                      onClick={() => movePreset('remove', preset.id, 'up')}
                      type="button"
                    >
                      ↑
                    </button>
                    <button
                      className="inline-button inline-button--tiny"
                      onClick={() => movePreset('remove', preset.id, 'down')}
                      type="button"
                    >
                      ↓
                    </button>
                    <button
                      className="danger-button danger-button--tiny"
                      onClick={() => removePreset('remove', preset.id)}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <label className="field">
                  <input
                    className="text-input"
                    onChange={(event) =>
                      updatePreset('remove', preset.id, 'label', event.target.value)
                    }
                    value={preset.label}
                  />
                </label>

                <div className="editor-row__fields editor-row__fields--preset">
                  <input
                    className="number-input"
                    min="1"
                    onChange={(event) =>
                      updatePreset('remove', preset.id, 'points', event.target.value)
                    }
                    type="number"
                    value={preset.points}
                  />
                  <input
                    className="text-input text-input--icon"
                    inputMode="text"
                    maxLength={8}
                    onChange={(event) =>
                      updatePreset('remove', preset.id, 'icon', event.target.value)
                    }
                    placeholder="💧"
                    value={preset.icon ?? ''}
                  />
                </div>

                <label className="toggle-row">
                  <input
                    checked={preset.visibleOnHome}
                    onChange={(event) =>
                      updatePreset('remove', preset.id, 'visibleOnHome', event.target.checked)
                    }
                    type="checkbox"
                  />
                  <span>Show this preset on the home screen</span>
                </label>
              </div>
            ))}
          </div>
        </section>

        <section className="settings-card">
          <div className="settings-card__header">
            <h3>Rewards</h3>
            <button className="inline-button" onClick={addReward} type="button">
              Add reward
            </button>
          </div>

          <div className="editor-list">
            {rewardDrafts.map((reward) => (
              <div
                className={`editor-row editor-row--reward ${
                  reward.isClaimed ? 'editor-row--reward-claimed' : ''
                }`}
                key={reward.id}
              >
                <div className="editor-row__top">
                  <div className="reward-editor__title">
                    <span className="reward-editor__sticker">
                      {reward.isClaimed ? '🏅' : getRewardCategoryIcon(reward.category)}
                    </span>
                    <div>
                      <strong>{reward.title || 'Reward'}</strong>
                      <p className="field__help">
                        {reward.isClaimed
                          ? `Claimed${reward.claimedAt ? ` on ${new Date(reward.claimedAt).toLocaleDateString()}` : ''}`
                          : reward.category === 'day-out'
                            ? 'Day out reward'
                            : 'Not claimed yet'}
                      </p>
                    </div>
                  </div>
                  <div className="preset-editor__actions">
                    <button
                      className="inline-button inline-button--tiny"
                      onClick={() => toggleRewardClaim(reward.id)}
                      type="button"
                    >
                      {reward.isClaimed ? 'Mark unclaimed' : 'Mark claimed'}
                    </button>
                    <button
                      className="danger-button danger-button--tiny"
                      onClick={() => removeReward(reward.id)}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="field">
                  <input
                    className="text-input"
                    onChange={(event) =>
                      updateReward(reward.id, 'title', event.target.value)
                    }
                    value={reward.title}
                  />
                </div>

                <div className="editor-row__fields">
                  <select
                    className="text-input"
                    onChange={(event) =>
                      updateReward(reward.id, 'category', event.target.value)
                    }
                    value={reward.category}
                  >
                    <option value="sticker">Sticker</option>
                    <option value="treat">Treat</option>
                    <option value="home">Home reward</option>
                    <option value="day-out">Day out</option>
                  </select>
                  <input
                    className="text-input text-input--icon"
                    maxLength={8}
                    onChange={(event) =>
                      updateReward(reward.id, 'icon', event.target.value)
                    }
                    placeholder={getRewardCategoryIcon(reward.category)}
                    value={reward.icon ?? ''}
                    />
                </div>

                <div className="editor-row__fields">
                  <select
                    className="text-input"
                    onChange={(event) =>
                      updateReward(reward.id, 'redemptionType', event.target.value)
                    }
                    value={reward.redemptionType}
                  >
                    <option value="spend-points">Spend points to redeem</option>
                    <option value="unlock-only">Unlock only</option>
                  </select>
                  <input
                    className="number-input"
                    min="1"
                    onChange={(event) =>
                      updateReward(reward.id, 'costPoints', event.target.value)
                    }
                    type="number"
                    value={reward.costPoints}
                  />
                </div>

                <div className="editor-row__fields">
                  <textarea
                    className="textarea-input"
                    onChange={(event) =>
                      updateReward(reward.id, 'description', event.target.value)
                    }
                    value={reward.description}
                  />
                  <input
                    className="number-input"
                    min="1"
                    onChange={(event) =>
                      updateReward(reward.id, 'milestone', event.target.value)
                    }
                    type="number"
                    value={reward.milestone}
                  />
                </div>

                {reward.category === 'day-out' ? (
                  <>
                    <div className="editor-row__fields">
                      <select
                        className="text-input"
                        onChange={(event) => {
                          const nextTemplate = event.target.value
                          updateReward(reward.id, 'venueTemplate', nextTemplate)
                          if (nextTemplate !== 'Custom place') {
                            updateReward(reward.id, 'venueName', nextTemplate)
                          }
                        }}
                        value={(reward.venueTemplate ?? reward.venueName) || 'Custom place'}
                      >
                        {DAY_OUT_PLACE_OPTIONS.map((place) => (
                          <option key={place} value={place}>
                            {place}
                          </option>
                        ))}
                      </select>
                      <input
                        className="text-input"
                        onChange={(event) =>
                          updateReward(reward.id, 'venueName', event.target.value)
                        }
                        placeholder="Venue name"
                        value={reward.venueName}
                      />
                    </div>

                    <label className="field">
                      <span className="field-label">Booking link</span>
                      <input
                        className="text-input"
                        onChange={(event) =>
                          updateReward(reward.id, 'bookingUrl', event.target.value)
                        }
                        placeholder="https://..."
                        value={reward.bookingUrl}
                      />
                    </label>

                    <div className="editor-row__fields">
                      <input
                        className="text-input"
                        onChange={(event) =>
                          updateReward(reward.id, 'discountCode', event.target.value)
                        }
                        placeholder="Discount code"
                        value={reward.discountCode}
                      />
                      <input
                        className="text-input"
                        onChange={(event) =>
                          updateReward(reward.id, 'offerSource', event.target.value)
                        }
                        placeholder="Offer source"
                        value={reward.offerSource}
                      />
                    </div>

                    <label className="field">
                      <span className="field-label">Eligibility / notes</span>
                      <textarea
                        className="textarea-input"
                        onChange={(event) =>
                          updateReward(reward.id, 'eligibilityNotes', event.target.value)
                        }
                        value={reward.eligibilityNotes}
                      />
                    </label>

                    <label className="field">
                      <span className="field-label">Last checked date</span>
                      <input
                        className="text-input"
                        onChange={(event) =>
                          updateReward(reward.id, 'lastCheckedAt', event.target.value)
                        }
                        placeholder="2026-03-11"
                        type="date"
                        value={reward.lastCheckedAt ? reward.lastCheckedAt.slice(0, 10) : ''}
                      />
                    </label>
                  </>
                ) : null}

                <label className="toggle-row">
                  <input
                    checked={reward.visibleBeforeUnlock}
                    onChange={(event) =>
                      updateRewardToggle(reward.id, 'visibleBeforeUnlock', event.target.checked)
                    }
                    type="checkbox"
                  />
                  <span>Show reward before it is unlocked</span>
                </label>

                <div className="reward-editor__status">
                  <span className={`chip ${reward.isClaimed ? 'chip--claimed' : 'chip--reward'}`}>
                    {reward.isClaimed ? 'Claimed reward' : reward.category === 'day-out' ? 'Day out plan' : 'Ready to earn'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="settings-card">
          <div className="settings-card__header">
            <h3>Storage tools</h3>
            <div className="chip">🧹 Careful</div>
          </div>

          <div className="actions-row">
            <button className="inline-button" onClick={onExportData} type="button">
              Export backup
            </button>
            <button
              className="inline-button"
              onClick={() => importInputRef.current?.click()}
              type="button"
            >
              Import backup
            </button>
          </div>

          <input
            accept="application/json,.json"
            className="hidden-input"
            onChange={handleImportPick}
            ref={importInputRef}
            type="file"
          />

          {transferMessage ? <p className="success-text">{transferMessage}</p> : null}
          {transferError ? <p className="error-text">{transferError}</p> : null}

          <p className="field__help">
            Imports are checked before they replace the current local data, and you will be asked
            to confirm before anything is overwritten.
          </p>

          <div className="actions-row">
            <button className="danger-button" onClick={onRequestResetPoints} type="button">
              Reset points
            </button>
            <button
              className="danger-button"
              disabled={syncSession.mode === 'synced'}
              onClick={onRequestClearHistory}
              type="button"
            >
              Clear history
            </button>
          </div>
          <p className="field__help">
            {syncSession.mode === 'synced'
              ? 'Reset points still adds a shared parent reset event. Shared history stays protected and cannot be cleared from one device.'
              : 'Destructive actions are protected with one more confirmation step.'}
          </p>
        </section>

        {error ? <p className="error-text">{error}</p> : null}

        <button className="save-button save-button--primary" onClick={handleSave} type="button">
          Save settings
        </button>
      </div>
    </main>
  )
}

const createPresetDraft = (
  group: 'add' | 'remove',
  index: number,
): PresetAction => ({
  deletedAt: null,
  id: `draft-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  icon: null,
  label: group === 'add' ? 'New win' : 'New lose',
  points: 50,
  sortOrder: index,
  source: 'custom',
  updatedAt: new Date().toISOString(),
  updatedByDeviceId: null,
  visibleOnHome: true,
})

const reorderPresets = (presets: PresetAction[]) =>
  presets.map((preset, index) => ({
    ...preset,
    sortOrder: index,
  }))

const createRewardDraft = (): Reward => ({
  bookingUrl: '',
  category: 'day-out',
  claimedAt: null,
  costPoints: 2000,
  deletedAt: null,
  description: 'A lovely reward to celebrate progress.',
  discountCode: '',
  eligibilityNotes: '',
  hasCelebratedUnlock: false,
  id: `reward-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  icon: null,
  isClaimed: false,
  lastCheckedAt: null,
  milestone: 2000,
  offerSource: '',
  redeemedAt: null,
  redemptionType: 'spend-points',
  sortOrder: Date.now(),
  title: 'New day out',
  unlockedAt: null,
  updatedAt: new Date().toISOString(),
  updatedByDeviceId: null,
  venueName: '',
  venueTemplate: 'Custom place',
  visibleBeforeUnlock: true,
})
