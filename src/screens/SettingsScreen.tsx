import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { DEFAULT_PROFILE, sanitizePresets, sanitizeProfile, sanitizeRewards } from '../lib/defaults'
import { prepareImageDataUrl } from '../lib/images'
import type { Presets, Profile, Reward } from '../types/app'

interface SettingsPayload {
  presets: Presets
  profile: Profile
  rewards: Reward[]
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
}: SettingsScreenProps) => {
  const [childName, setChildName] = useState(profile.childName)
  const [photoDataUrl, setPhotoDataUrl] = useState(profile.photoDataUrl)
  const [addPresets, setAddPresets] = useState(presets.add)
  const [removePresets, setRemovePresets] = useState(presets.remove)
  const [rewardDrafts, setRewardDrafts] = useState(rewards)
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
    setError('')
    setIsProcessingPhoto(false)
  }, [isActive, presets, profile, rewards])

  const updatePreset = (
    group: 'add' | 'remove',
    id: string,
    field: 'label' | 'points',
    value: string,
  ) => {
    const setter = group === 'add' ? setAddPresets : setRemovePresets

    setter((currentPresets) =>
      currentPresets.map((preset) =>
        preset.id === id
          ? {
              ...preset,
              [field]:
                field === 'points'
                  ? Number.parseInt(value || '0', 10) || 0
                  : value,
            }
          : preset,
      ),
    )
  }

  const addPreset = (group: 'add' | 'remove') => {
    const setter = group === 'add' ? setAddPresets : setRemovePresets

    setter((currentPresets) => [
      ...currentPresets,
      {
        id: `draft-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        label: group === 'add' ? 'New win' : 'New lose',
        points: 50,
      },
    ])
  }

  const removePreset = (group: 'add' | 'remove', id: string) => {
    const setter = group === 'add' ? setAddPresets : setRemovePresets
    setter((currentPresets) =>
      currentPresets.filter((preset) => preset.id !== id),
    )
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
      {
        description: 'A lovely reward to celebrate progress.',
        id: `reward-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        milestone: 2000,
        title: 'New reward',
      },
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

    if (!nextProfile.childName.trim()) {
      setError('Add a child name before saving.')
      return
    }

    onSave({
      presets: nextPresets,
      profile: nextProfile,
      rewards: nextRewards,
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
            <h3>Win point presets</h3>
            <button className="inline-button" onClick={() => addPreset('add')} type="button">
              Add preset
            </button>
          </div>

          <div className="editor-list">
            {addPresets.map((preset) => (
              <div className="editor-row" key={preset.id}>
                <div className="editor-row__top">
                  <strong>{preset.label || 'Preset'}</strong>
                  <button
                    className="danger-button"
                    onClick={() => removePreset('add', preset.id)}
                    type="button"
                  >
                    Delete
                  </button>
                </div>

                <div className="editor-row__fields">
                  <input
                    className="text-input"
                    onChange={(event) =>
                      updatePreset('add', preset.id, 'label', event.target.value)
                    }
                    value={preset.label}
                  />
                  <input
                    className="number-input"
                    min="1"
                    onChange={(event) =>
                      updatePreset('add', preset.id, 'points', event.target.value)
                    }
                    type="number"
                    value={preset.points}
                  />
                </div>
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
              <div className="editor-row" key={preset.id}>
                <div className="editor-row__top">
                  <strong>{preset.label || 'Preset'}</strong>
                  <button
                    className="danger-button"
                    onClick={() => removePreset('remove', preset.id)}
                    type="button"
                  >
                    Delete
                  </button>
                </div>

                <div className="editor-row__fields">
                  <input
                    className="text-input"
                    onChange={(event) =>
                      updatePreset('remove', preset.id, 'label', event.target.value)
                    }
                    value={preset.label}
                  />
                  <input
                    className="number-input"
                    min="1"
                    onChange={(event) =>
                      updatePreset('remove', preset.id, 'points', event.target.value)
                    }
                    type="number"
                    value={preset.points}
                  />
                </div>
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
