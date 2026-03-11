import { ModalSheet } from './ModalSheet'

interface DailyReminderPromptProps {
  onAddPointsNow: () => void
  onDismiss: () => void
  open: boolean
}

export const DailyReminderPrompt = ({
  onAddPointsNow,
  onDismiss,
  open,
}: DailyReminderPromptProps) => (
  <ModalSheet
    description="No points have been logged yet today. Want to add them now?"
    onClose={onDismiss}
    open={open}
    title="Any points today?"
  >
    <div className="daily-reminder">
      <div className="daily-reminder__art" aria-hidden="true">
        <span>⭐</span>
        <span>📝</span>
        <span>☁️</span>
      </div>

      <div className="modal-actions">
        <button
          className="save-button modal-actions__button modal-actions__button--primary"
          onClick={onAddPointsNow}
          type="button"
        >
          Add points now
        </button>
        <button className="soft-button modal-actions__button" onClick={onDismiss} type="button">
          Not now
        </button>
      </div>
    </div>
  </ModalSheet>
)
