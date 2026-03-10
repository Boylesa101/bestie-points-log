import type { PointActionType, PresetAction } from '../types/app'

interface PresetGridProps {
  onSelect: (label: string, points: number, type: PointActionType) => void
  presets: PresetAction[]
  title: string
  tone: PointActionType
}

export const PresetGrid = ({
  onSelect,
  presets,
  title,
  tone,
}: PresetGridProps) => (
  <section className="action-panel">
    <div className="section-heading">
      <div>
        <p className="section-heading__eyebrow">
          {tone === 'add' ? 'Win points' : 'Lose points'}
        </p>
        <h3>{title}</h3>
      </div>
      <div className="chip">{tone === 'add' ? '💚 +50s' : '❤️ -50s'}</div>
    </div>

    {presets.length ? (
      <div className="preset-grid">
        {presets.map((preset) => (
          <button
            className={`preset-button preset-button--${tone}`}
            key={preset.id}
            onClick={() => onSelect(preset.label, preset.points, tone)}
            type="button"
          >
            <span className="preset-button__label">{preset.label}</span>
            <span className="preset-button__points">
              {tone === 'add' ? '+' : '-'}
              {preset.points}
            </span>
          </button>
        ))}
      </div>
    ) : (
      <p className="card__hint">Add presets in settings to fill this section.</p>
    )}
  </section>
)
