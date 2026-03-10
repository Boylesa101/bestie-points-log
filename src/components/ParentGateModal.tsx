import { useState } from 'react'
import { ModalSheet } from './ModalSheet'

interface ParentGateModalProps {
  onClose: () => void
  onUnlock: (pin: string) => boolean
}

export const ParentGateModal = ({
  onClose,
  onUnlock,
}: ParentGateModalProps) => {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')

  const handleUnlock = () => {
    const isValid = onUnlock(pin.trim())

    if (!isValid) {
      setError('That PIN did not match.')
    }
  }

  return (
    <ModalSheet
      description="Enter the parent PIN to open settings on this device."
      onClose={onClose}
      open
      title="Parent gate"
    >
      <label className="field">
        <span className="field-label">Parent PIN</span>
        <input
          autoComplete="off"
          className="number-input"
          inputMode="numeric"
          maxLength={8}
          onChange={(event) => {
            setPin(event.target.value)
            setError('')
          }}
          placeholder="4-8 digits"
          type="password"
          value={pin}
        />
      </label>

      <p className="field__help">
        Forgot the PIN? Because this app is local-only, the fallback is clearing this app&apos;s
        browser data on this device.
      </p>

      {error ? <p className="error-text">{error}</p> : null}

      <div className="sheet-actions">
        <button className="sheet-button sheet-button--secondary" onClick={onClose} type="button">
          Cancel
        </button>
        <button className="sheet-button sheet-button--primary" onClick={handleUnlock} type="button">
          Unlock
        </button>
      </div>
    </ModalSheet>
  )
}
