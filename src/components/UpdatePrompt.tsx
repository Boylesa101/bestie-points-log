import { ModalSheet } from './ModalSheet'

interface UpdatePromptProps {
  onConfirm: () => void
  onDismiss: () => void
  open: boolean
}

export const UpdatePrompt = ({
  onConfirm,
  onDismiss,
  open,
}: UpdatePromptProps) => (
  <ModalSheet
    description="A new version of Bestie Points Log is ready. Update now?"
    onClose={onDismiss}
    open={open}
    title="New version available"
  >
    <div className="modal-actions">
      <button className="soft-button modal-actions__button" onClick={onDismiss} type="button">
        No
      </button>
      <button
        className="save-button modal-actions__button modal-actions__button--primary"
        onClick={onConfirm}
        type="button"
      >
        Yes
      </button>
    </div>
  </ModalSheet>
)
