import { ModalSheet } from './ModalSheet'

interface ConfirmDialogProps {
  confirmLabel: string
  description: string
  onCancel: () => void
  onConfirm: () => void
  open: boolean
  title: string
  tone?: 'danger' | 'primary'
}

export const ConfirmDialog = ({
  confirmLabel,
  description,
  onCancel,
  onConfirm,
  open,
  title,
  tone = 'primary',
}: ConfirmDialogProps) => (
  <ModalSheet
    description={description}
    onClose={onCancel}
    open={open}
    title={title}
  >
    <div className="sheet-actions">
      <button className="sheet-button sheet-button--secondary" onClick={onCancel} type="button">
        Cancel
      </button>
      <button
        className={`sheet-button ${
          tone === 'danger' ? 'sheet-button--danger' : 'sheet-button--primary'
        }`}
        onClick={onConfirm}
        type="button"
      >
        {confirmLabel}
      </button>
    </div>
  </ModalSheet>
)
