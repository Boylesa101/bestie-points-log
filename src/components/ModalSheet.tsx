import type { ReactNode } from 'react'

interface ModalSheetProps {
  children: ReactNode
  description?: string
  onClose: () => void
  open: boolean
  title: string
}

export const ModalSheet = ({
  children,
  description,
  onClose,
  open,
  title,
}: ModalSheetProps) => {
  if (!open) {
    return null
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        aria-modal="true"
        className="modal-sheet"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="modal-sheet__top">
          <div>
            <h3>{title}</h3>
            {description ? <p>{description}</p> : null}
          </div>

          <button
            aria-label="Close"
            className="icon-button"
            onClick={onClose}
            type="button"
          >
            ✕
          </button>
        </div>

        <div className="modal-sheet__body">{children}</div>
      </div>
    </div>
  )
}
