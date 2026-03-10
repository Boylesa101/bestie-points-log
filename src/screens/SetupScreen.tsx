import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { DEFAULT_PROFILE, sanitizeProfile } from '../lib/defaults'
import { prepareImageDataUrl } from '../lib/images'
import type { Profile } from '../types/app'

interface SetupScreenProps {
  onComplete: (profile: Profile) => void
  profile: Profile
}

export const SetupScreen = ({ onComplete, profile }: SetupScreenProps) => {
  const [childName, setChildName] = useState(profile.childName || DEFAULT_PROFILE.childName)
  const [photoDataUrl, setPhotoDataUrl] = useState(profile.photoDataUrl)
  const [error, setError] = useState('')
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false)
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

  return (
    <main className="setup-screen">
      <div className="setup-screen__sky" />
      <div className="setup-screen__cloud setup-screen__cloud--left">☁️</div>
      <div className="setup-screen__cloud setup-screen__cloud--right">⭐</div>

      <section className="setup-card">
        <p className="setup-card__eyebrow">First-time setup</p>
        <h1>Make this phone Henry’s Bestie Points log</h1>
        <p className="setup-card__copy">
          Add a name and photo. Everything stays saved only on this device.
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

        <p className="field__help">
          {isProcessingPhoto
            ? 'Saving the photo for this phone...'
            : 'Photos are cropped and compressed before they are stored locally.'}
        </p>

        {error ? <p className="error-text">{error}</p> : null}

        <button
          className="setup-button setup-button--primary"
          onClick={() =>
            onComplete(
              sanitizeProfile({
                childName: childName.trim() || DEFAULT_PROFILE.childName,
                photoDataUrl,
              }),
            )
          }
          type="button"
        >
          Continue to Bestie Points
        </button>
      </section>
    </main>
  )
}
