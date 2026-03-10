import type { Profile } from '../types/app'

interface ChildHeaderProps {
  onOpenSettings: () => void
  profile: Profile
  totalPoints: number
}

export const ChildHeader = ({
  onOpenSettings,
  profile,
  totalPoints,
}: ChildHeaderProps) => (
  <section className="surface-card header-card child-header">
    <div className="child-header__top">
      <div className="avatar" aria-label={`${profile.childName} avatar`}>
        {profile.photoDataUrl ? (
          <img alt={`${profile.childName}`} src={profile.photoDataUrl} />
        ) : (
          <div className="avatar__placeholder">
            <span>{profile.childName.charAt(0).toUpperCase()}</span>
            <span className="avatar__sparkle">⭐</span>
          </div>
        )}
      </div>

      <div className="child-header__copy">
        <h2>{profile.childName}</h2>
        <p>Bright smiles, big effort, and quick point updates.</p>
      </div>

      <button
        aria-label="Open settings"
        className="icon-button"
        onClick={onOpenSettings}
        type="button"
      >
        ⚙️
      </button>
    </div>

    <div className="child-header__total">
      <div>
        <p className="child-header__total-label">Current Bestie Points</p>
        <div className="child-header__total-value">
          {totalPoints}
          <small>pts</small>
        </div>
      </div>

      <div className="chip">🌈 Keep going!</div>
    </div>
  </section>
)
