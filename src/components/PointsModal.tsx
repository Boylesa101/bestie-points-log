import { useState } from 'react'
import { runToneCheck, type ToneCheckResult } from '../lib/toneCheck'
import { ParentSupportSheet } from './ParentSupportSheet'
import type { PointsActionInput, PointActionType } from '../types/app'
import { ModalSheet } from './ModalSheet'
import { ToneCheckPrompt } from './ToneCheckPrompt'

interface PointsModalProps {
  onClose: () => void
  onSave: (payload: PointsActionInput) => void
  toneCheckEnabled: boolean
  toneCheckSuggestionsEnabled: boolean
  toneCheckSupportEnabled: boolean
}

export const PointsModal = ({
  onClose,
  onSave,
  toneCheckEnabled,
  toneCheckSuggestionsEnabled,
  toneCheckSupportEnabled,
}: PointsModalProps) => {
  const [type, setType] = useState<PointActionType>('add')
  const [pointsText, setPointsText] = useState('50')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [toneCheckResult, setToneCheckResult] = useState<ToneCheckResult | null>(null)
  const [pendingPayload, setPendingPayload] = useState<PointsActionInput | null>(null)
  const [overrideSignature, setOverrideSignature] = useState<string | null>(null)
  const [isSupportOpen, setIsSupportOpen] = useState(false)

  const handleSave = () => {
    const amount = Number(pointsText)

    if (!Number.isFinite(amount) || amount < 1) {
      setError('Type a points amount bigger than zero.')
      return
    }

    const payload = {
      amount,
      reason,
      type,
    }

    if (!toneCheckEnabled || !reason.trim()) {
      onSave(payload)
      return
    }

    const nextToneCheck = runToneCheck([
      {
        key: 'reason',
        label: 'Custom reason',
        value: reason,
      },
    ])

    if (nextToneCheck.isFlagged && nextToneCheck.signature !== overrideSignature) {
      setPendingPayload(payload)
      setToneCheckResult(nextToneCheck)
      return
    }

    onSave(payload)
  }

  return (
    <>
      <ModalSheet
        description="Choose how many points to add or take away."
        onClose={onClose}
        open
        title="Type points"
      >
        <div className="toggle-group">
          <button
            className={`tab-button tab-button--add ${
              type === 'add' ? 'tab-button--active' : ''
            }`}
            onClick={() => setType('add')}
            type="button"
          >
            Add points
          </button>
          <button
            className={`tab-button tab-button--remove ${
              type === 'remove' ? 'tab-button--active' : ''
            }`}
            onClick={() => setType('remove')}
            type="button"
          >
            Take away
          </button>
        </div>

        <label className="field">
          <span className="field-label">Points</span>
          <input
            className="number-input"
            inputMode="numeric"
            min="1"
            onChange={(event) => setPointsText(event.target.value)}
            placeholder="50"
            type="number"
            value={pointsText}
          />
        </label>

        <label className="field">
          <span className="field-label">Reason (optional)</span>
          <input
            className="text-input"
            onChange={(event) => {
              setReason(event.target.value)
              setOverrideSignature(null)
            }}
            placeholder={type === 'add' ? 'Why were points won?' : 'Why were points lost?'}
            value={reason}
          />
        </label>

        {error ? <p className="error-text">{error}</p> : null}

        <div className="sheet-actions">
          <button className="sheet-button sheet-button--secondary" onClick={onClose} type="button">
            Cancel
          </button>
          <button
            className={`sheet-button ${
              type === 'add' ? 'sheet-button--primary' : 'sheet-button--danger'
            }`}
            onClick={handleSave}
            type="button"
          >
            Save
          </button>
        </div>
      </ModalSheet>

      <ToneCheckPrompt
        onEdit={() => setToneCheckResult(null)}
        onOpenSupport={() => setIsSupportOpen(true)}
        onUseAnyway={() => {
          if (pendingPayload && toneCheckResult) {
            setOverrideSignature(toneCheckResult.signature)
            setToneCheckResult(null)
            onSave(pendingPayload)
          }
        }}
        open={Boolean(toneCheckResult)}
        result={toneCheckResult}
        showSuggestions={toneCheckSuggestionsEnabled}
        showSupportLink={toneCheckSupportEnabled}
      />

      <ParentSupportSheet onClose={() => setIsSupportOpen(false)} open={isSupportOpen} />
    </>
  )
}
