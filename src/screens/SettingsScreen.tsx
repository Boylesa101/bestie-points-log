import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { DEFAULT_PROFILE, sanitizePresets, sanitizeProfile, sanitizeRewards } from '../lib/defaults'
import { getPresetIcon } from '../lib/icons'
import { prepareImageDataUrl } from '../lib/images'
import type { AppSettings, PresetAction, Presets, Profile, Reward } from '../types/app'

interface SettingsPayload {
  presets: Presets
  profile: Profile
  rewards: Reward[]
  settings: AppSettings
}

interface SettingsScreenProps {
  isActive: boolean
  onBack: () => void
  onRequestClearHistory: () => void
  onRequestResetPoints: () => void
  onSave: (payload: SettingsPayload) => void
  presets: Presets
  profile: Profile
  rewards: Reward[]
  settings: AppSettings
}

export const SettingsScreen = ({
  isActive,
  onBack,
  onRequestClearHistory,
  onRequestResetPoints,
  onSave,
  presets,
  profile,
  rewards,
  settings,
}: SettingsScreenProps) => {
  const [childName, setChildName] = useState(profile.childName)
  const [photoDataUrl, setPhotoDataUrl] = useState(profile.photoDataUrl)
  const [addPresets, setAddPresets] = useState(presets.add)
  const [removePresets, setRemovePresets] = useState(presets.remove)
  const [rewardDrafts, setRewardDrafts] = useState(rewards)
  const [soundEnabled, setSoundEnabled] = useState(settings.soundEnabled)
  const [lockActive, setLockActive] = useState(settings.parentLock.isLocked)
  const [pinDraft, setPinDraft] = useState('')
  const [confirmPinDraft, setConfirmPinDraft] = useState('')
  const [isChangingPin, setIsChangingPin] = useState(!settings.parentLock.pin)
  const [shouldRemovePin, setShouldRemovePin] = useState(false)
  const [error, setError] = useState('')
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

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
    setPinDraft('')
    setConfirmPinDraft('')
    setIsChangingPin(!settings.parentLock.pin)
    setShouldRemovePin(false)
    setError('')
    setIsProcessingPhoto(false)
  }, [isActive, presets, profile, rewards, settings])

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
    field: 'description' | 'milestone' | 'title',
    value: string,
  ) => {
    setRewardDrafts((currentRewards) =>
      currentRewards.map((reward) =>
        reward.id === id
          ? {
              ...reward,
              [field]:
                field === 'milestone'
                  ? Number.parseInt(value || '0', 10) || 0
                  : value,
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

  const handleSave = () => {
    const nextProfile = sanitizeProfile({
      childName: childName.trim() || DEFAULT_PROFILE.childName,
      photoDataUrl,
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
        return
      }

      if (pinDraft.trim() !== confirmPinDraft.trim()) {
        setError('The new PIN and confirm PIN must match.')
        return
      }
    }

    if (!nextProfile.childName.trim()) {
      setError('Add a child name before saving.')
      return
    }

    const nextPin =
      shouldRemovePin
        ? null
        : wantsNewPin
          ? pinDraft.trim()
          : settings.parentLock.pin

    const nextSettings: AppSettings = {
      ...settings,
      parentLock: {
        enabled: Boolean(nextPin),
        isLocked: nextPin ? lockActive : false,
        pin: nextPin,
      },
      soundEnabled,
    }

    onSave({
      presets: nextPresets,
      profile: nextProfile,
      rewards: nextRewards,
      settings: nextSettings,
    })
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
            <h3>Parent lock & sounds</h3>
            <div className="chip">🔐 Local only</div>
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
              <div className="editor-row" key={reward.id}>
                <div className="editor-row__top">
                  <strong>{reward.title || 'Reward'}</strong>
                  <button
                    className="danger-button"
                    onClick={() => removeReward(reward.id)}
                    type="button"
                  >
                    Delete
                  </button>
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
            <button className="danger-button" onClick={onRequestResetPoints} type="button">
              Reset points
            </button>
            <button className="danger-button" onClick={onRequestClearHistory} type="button">
              Clear history
            </button>
          </div>
          <p className="field__help">
            Destructive actions are protected with one more confirmation step.
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
  id: `draft-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  icon: null,
  label: group === 'add' ? 'New win' : 'New lose',
  points: 50,
  sortOrder: index,
  source: 'custom',
  visibleOnHome: true,
})

const reorderPresets = (presets: PresetAction[]) =>
  presets.map((preset, index) => ({
    ...preset,
    sortOrder: index,
  }))

const createRewardDraft = (): Reward => ({
  claimedAt: null,
  description: 'A lovely reward to celebrate progress.',
  id: `reward-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  isClaimed: false,
  milestone: 2000,
  title: 'New reward',
})
