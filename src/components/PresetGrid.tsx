import type { PointActionType, PresetAction } from '../types/app'
import { getPresetIcon } from '../lib/icons'

interface PresetGridProps {
  onSelect: (label: string, points: number, type: PointActionType) => void
  presets: PresetAction[]
  summary?: string
  title: string
  tone: PointActionType
}

export const PresetGrid = ({
  onSelect,
  presets,
  summary,
  title,
  tone,
}: PresetGridProps) => (
  <section className={`action-panel action-panel--${tone}`}>
    <div className="section-heading section-heading--mock">
      <div>
        <p className="section-heading__eyebrow">{title}</p>
        <h3>{title}</h3>
      </div>
      <div className={`section-heading__tag section-heading__tag--${tone}`}>
        {summary ?? (tone === 'add' ? 'Good jobs' : 'Oopsies')}
      </div>
    </div>

    {presets.length ? (
      <div className={`preset-grid preset-grid--${tone}`}>
        {presets.map((preset) => (
          <button
            className={`preset-button preset-button--${tone}`}
            key={preset.id}
            onClick={() => onSelect(preset.label, preset.points, tone)}
            type="button"
          >
            <span className="preset-button__icon">{getPresetIcon(preset, tone)}</span>
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
