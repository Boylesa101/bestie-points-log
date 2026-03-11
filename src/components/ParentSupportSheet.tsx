import { ModalSheet } from './ModalSheet'

interface ParentSupportSheetProps {
  onClose: () => void
  open: boolean
}

export const ParentSupportSheet = ({
  onClose,
  open,
}: ParentSupportSheetProps) => (
  <ModalSheet
    description="A little extra support is here if things feel tough."
    onClose={onClose}
    open={open}
    title="Need support?"
  >
    <div className="support-sheet">
      <div className="support-card">
        <strong>Family Lives</strong>
        <p>Parenting and family support helpline</p>
        <a className="support-link" href="tel:08088002222">
          0808 800 2222
        </a>
        <a className="support-link" href="https://wa.me/447441444125" rel="noreferrer" target="_blank">
          WhatsApp 07441 444125
        </a>
      </div>

      <div className="support-card">
        <strong>NSPCC Helpline</strong>
        <p>For serious worries about a child’s safety</p>
        <a className="support-link" href="tel:08088005000">
          0808 800 5000
        </a>
      </div>

      <p className="support-note">
        If there is immediate danger, contact your local emergency services right away.
      </p>
    </div>
  </ModalSheet>
)
