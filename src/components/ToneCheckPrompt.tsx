import type { ToneCheckResult } from '../lib/toneCheck'
import { ModalSheet } from './ModalSheet'

interface ToneCheckPromptProps {
  onEdit: () => void
  onOpenSupport?: () => void
  onUseAnyway: () => void
  open: boolean
  result: ToneCheckResult | null
  showSuggestions: boolean
  showSupportLink: boolean
}

const getToneMessage = (result: ToneCheckResult | null) => {
  if (!result) {
    return ''
  }

  if (result.severity === 'high') {
    return 'This wording may feel upsetting or shaming for a child.'
  }

  return 'This sounds a little harsh for a child-facing app. Would you like to change the wording?'
}

export const ToneCheckPrompt = ({
  onEdit,
  onOpenSupport,
  onUseAnyway,
  open,
  result,
  showSuggestions,
  showSupportLink,
}: ToneCheckPromptProps) => (
  <ModalSheet
    description={getToneMessage(result)}
    onClose={onEdit}
    open={open}
    title="Are you sure?"
  >
    <div className="tone-check">
      <p className="tone-check__hint">
        Try a calmer phrase so the app stays fun and encouraging.
      </p>

      {result?.fieldLabels.length ? (
        <div className="tone-check__tags">
          {result.fieldLabels.map((label) => (
            <span className="chip chip--tone" key={label}>
              {label}
            </span>
          ))}
        </div>
      ) : null}

      {showSuggestions && result?.suggestions.length ? (
        <div className="tone-check__suggestions">
          <strong>Calmer wording ideas</strong>
          <div className="tone-check__tags">
            {result.suggestions.map((suggestion) => (
              <span className="chip chip--tone-suggestion" key={suggestion}>
                {suggestion}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {showSupportLink ? (
        <button className="soft-button soft-button--violet tone-check__support" onClick={onOpenSupport} type="button">
          Need support?
        </button>
      ) : null}

      <div className="modal-actions">
        <button className="soft-button modal-actions__button" onClick={onEdit} type="button">
          Edit wording
        </button>
        <button
          className="save-button modal-actions__button modal-actions__button--primary"
          onClick={onUseAnyway}
          type="button"
        >
          Use anyway
        </button>
      </div>
    </div>
  </ModalSheet>
)
