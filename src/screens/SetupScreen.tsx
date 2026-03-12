import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { DEFAULT_PROFILE, sanitizeProfile } from '../lib/defaults'
import { prepareImageDataUrl } from '../lib/images'
import type { PairingCodeState, Profile } from '../types/app'

interface SetupScreenProps {
  defaultDeviceName: string
  defaultParentName: string
  onCompleteLocal: (profile: Profile) => void
  onCreateSynced: (input: {
    deviceName: string
    parentName: string
    profile: Profile
  }) => Promise<PairingCodeState>
  onFinishSyncedSetup: () => void
  onJoinSynced: (input: {
    code: string
    deviceName: string
    parentName: string
  }) => Promise<void>
  profile: Profile
}

type SetupMode = 'choice' | 'create' | 'join' | 'pair-code'

export const SetupScreen = ({
  defaultDeviceName,
  defaultParentName,
  onCompleteLocal,
  onCreateSynced,
  onFinishSyncedSetup,
  onJoinSynced,
  profile,
}: SetupScreenProps) => {
  const [mode, setMode] = useState<SetupMode>('choice')
  const [childName, setChildName] = useState(profile.childName || DEFAULT_PROFILE.childName)
  const [photoDataUrl, setPhotoDataUrl] = useState(profile.photoDataUrl)
  const [joinCode, setJoinCode] = useState('')
  const [parentName, setParentName] = useState(defaultParentName)
  const [deviceName, setDeviceName] = useState(defaultDeviceName)
  const [pairingCode, setPairingCode] = useState<PairingCodeState | null>(null)
  const [isSyncEnabled, setIsSyncEnabled] = useState(true)
  const [error, setError] = useState('')
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false)
  const [isWorking, setIsWorking] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

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

  const handleCreate = async () => {
    const nextProfile = sanitizeProfile({
      childName: childName.trim() || DEFAULT_PROFILE.childName,
      photoDataUrl,
    })

    if (!nextProfile.childName.trim()) {
      setError('Add a child name before continuing.')
      return
    }

    setError('')

    if (!isSyncEnabled) {
      onCompleteLocal(nextProfile)
      return
    }

    if (!parentName.trim()) {
      setError('Add your parent name for family sync.')
      return
    }

    setIsWorking(true)

    try {
      const nextPairingCode = await onCreateSynced({
        deviceName: deviceName.trim() || 'Phone',
        parentName: parentName.trim(),
        profile: nextProfile,
      })
      setPairingCode(nextPairingCode)
      setMode('pair-code')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'The shared family could not be created.')
    } finally {
      setIsWorking(false)
    }
  }

  const handleJoin = async () => {
    if (!joinCode.trim() || !parentName.trim()) {
      setError('Enter the sync code and your parent display name.')
      return
    }

    setIsWorking(true)
    setError('')

    try {
      await onJoinSynced({
        code: joinCode.trim(),
        deviceName: deviceName.trim() || 'Phone',
        parentName: parentName.trim(),
      })
      onFinishSyncedSetup()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'That sync code could not be used.')
    } finally {
      setIsWorking(false)
    }
  }

  const handleCopyCode = async () => {
    if (!pairingCode?.code) {
      return
    }

    try {
      await navigator.clipboard.writeText(pairingCode.code)
    } catch {
      setError('The code could not be copied. You can still type it on the second phone.')
    }
  }

  return (
    <main className="setup-screen">
      <div className="setup-screen__sky" />
      <div className="setup-screen__cloud setup-screen__cloud--left">☁️</div>
      <div className="setup-screen__cloud setup-screen__cloud--right">⭐</div>

      <section className="setup-card setup-card--wide">
        {mode === 'choice' ? (
          <>
            <p className="setup-card__eyebrow">First-time setup</p>
            <h1>Choose how this phone should join Bestie Points</h1>
            <p className="setup-card__copy">
              Create a new log for this child, or enter a share code from the first phone to join the same family log.
            </p>

            <div className="setup-choice-grid">
              <button
                className="setup-choice-card"
                onClick={() => setMode('create')}
                type="button"
              >
                <strong>Create new Bestie Points Log</strong>
                <span>Set up this child, then choose local-only mode or create a share code for the second parent phone.</span>
              </button>

              <button
                className="setup-choice-card setup-choice-card--alt"
                onClick={() => setMode('join')}
                type="button"
              >
                <strong>Join with sync code</strong>
                <span>Use the share code from the first phone to pull the same child name, photo, points, history, presets, and rewards.</span>
              </button>
            </div>
          </>
        ) : null}

        {mode === 'create' ? (
          <>
            <div className="section-heading">
              <div>
                <p className="setup-card__eyebrow">Create new</p>
                <h1>Set up this child</h1>
              </div>
              <button className="soft-button" onClick={() => setMode('choice')} type="button">
                Back
              </button>
            </div>

            <p className="setup-card__copy">
              Add the child details first, then choose local-only mode or create a family share code for the second phone.
            </p>

            <div className="setup-avatar">
              {photoDataUrl ? (
                <img alt={childName || 'Child photo'} src={photoDataUrl} />
              ) : (
                <>
                  <span>📷</span>
                  <div className="setup-avatar__badge">⭐</div>
                </>
              )}
            </div>

            <div className="setup-actions">
              <button
                className="setup-button setup-button--secondary"
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                {photoDataUrl ? 'Change photo' : 'Add photo'}
              </button>
              {photoDataUrl ? (
                <button
                  className="setup-button setup-button--ghost"
                  onClick={() => setPhotoDataUrl(null)}
                  type="button"
                >
                  Use placeholder
                </button>
              ) : null}
            </div>

            <input
              accept="image/*"
              className="hidden-input"
              onChange={handlePhotoPick}
              ref={fileInputRef}
              type="file"
            />

            <label className="field">
              <span className="field-label">Child name</span>
              <input
                className="text-input text-input--playful"
                maxLength={40}
                onChange={(event) => setChildName(event.target.value)}
                placeholder="Henry"
                value={childName}
              />
            </label>

            <label className="toggle-row toggle-row--card">
              <input
                checked={isSyncEnabled}
                onChange={(event) => setIsSyncEnabled(event.target.checked)}
                type="checkbox"
              />
              <span>Use sync across two parent devices</span>
            </label>

            {isSyncEnabled ? (
              <div className="setup-form-grid">
                <label className="field">
                  <span className="field-label">Your parent name</span>
                  <input
                    className="text-input text-input--playful"
                    maxLength={40}
                    onChange={(event) => setParentName(event.target.value)}
                    placeholder="Dad"
                    value={parentName}
                  />
                </label>

                <label className="field">
                  <span className="field-label">This device name</span>
                  <input
                    className="text-input text-input--playful"
                    maxLength={40}
                    onChange={(event) => setDeviceName(event.target.value)}
                    placeholder="Pixel 8"
                    value={deviceName}
                  />
                </label>
              </div>
            ) : (
              <p className="field__help">
                Local-only mode keeps everything on just this phone.
              </p>
            )}

            <p className="field__help">
              {isProcessingPhoto
                ? 'Saving the photo for this phone...'
                : isSyncEnabled
                  ? 'If sync is enabled, this phone will create a short share code for the second parent phone.'
                  : 'Photos are cropped and compressed before they are stored locally.'}
            </p>

            {error ? <p className="error-text">{error}</p> : null}

            <button
              className="setup-button setup-button--primary"
              disabled={isWorking}
              onClick={() => void handleCreate()}
              type="button"
            >
              {isWorking
                ? 'Creating family log...'
                : isSyncEnabled
                  ? 'Create family log and get share code'
                  : 'Finish local setup'}
            </button>
          </>
        ) : null}

        {mode === 'join' ? (
          <>
            <div className="section-heading">
              <div>
                <p className="setup-card__eyebrow">Join family mode</p>
                <h1>Link this phone with a sync code</h1>
              </div>
              <button className="soft-button" onClick={() => setMode('choice')} type="button">
                Back
              </button>
            </div>

            <label className="field">
              <span className="field-label">Sync code</span>
              <input
                className="text-input text-input--playful text-input--code"
                maxLength={12}
                onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                placeholder="ABCD-1234"
                value={joinCode}
              />
            </label>

            <label className="field">
              <span className="field-label">Your parent name</span>
              <input
                className="text-input text-input--playful"
                maxLength={40}
                onChange={(event) => setParentName(event.target.value)}
                placeholder="Mum"
                value={parentName}
              />
            </label>

            <label className="field">
              <span className="field-label">This device name</span>
              <input
                className="text-input text-input--playful"
                maxLength={40}
                onChange={(event) => setDeviceName(event.target.value)}
                placeholder="Mum's phone"
                value={deviceName}
              />
            </label>

            <p className="field__help">
              Enter the code shown on the first phone. The code works once and expires soon.
            </p>

            {error ? <p className="error-text">{error}</p> : null}

            <button
              className="setup-button setup-button--primary"
              disabled={isWorking}
              onClick={() => void handleJoin()}
              type="button"
            >
              {isWorking ? 'Joining family log...' : 'Join family log'}
            </button>
          </>
        ) : null}

        {mode === 'pair-code' && pairingCode ? (
          <>
            <p className="setup-card__eyebrow">Family sync is ready</p>
            <h1>Use this code on the second phone</h1>
            <p className="setup-card__copy">
              Enter this code on the other parent phone during first-time setup to link both devices to the same child log.
            </p>

            <div className="pair-code-card">
              <div className="pair-code-card__code">{pairingCode.code}</div>
              <p className="field__help">
                Expires {new Date(pairingCode.expiresAt).toLocaleTimeString([], {
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </p>
            </div>

            <div className="setup-actions">
              <button
                className="setup-button setup-button--secondary"
                onClick={() => void handleCopyCode()}
                type="button"
              >
                Copy code
              </button>
              <button
                className="setup-button setup-button--primary"
                onClick={onFinishSyncedSetup}
                type="button"
              >
                Continue to Bestie Points
              </button>
            </div>

            {error ? <p className="error-text">{error}</p> : null}
          </>
        ) : null}
      </section>
    </main>
  )
}
