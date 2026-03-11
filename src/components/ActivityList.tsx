import { formatPointsBadge, formatTimestamp } from '../lib/format'
import { getEntryIcon } from '../lib/icons'
import type { HistoryEntry } from '../types/app'

interface ActivityListProps {
  entries: HistoryEntry[]
  onViewAll?: () => void
  title?: string
}

export const ActivityList = ({
  entries,
  onViewAll,
  title = 'Today’s stars',
}: ActivityListProps) => (
  <section className="surface-card surface-card--list">
    <div className="section-heading section-heading--mock">
      <div>
        <p className="section-heading__eyebrow">{title}</p>
        <h3>{title}</h3>
      </div>
      {onViewAll ? (
        <button className="soft-button soft-button--violet" onClick={onViewAll} type="button">
          View all
        </button>
      ) : null}
    </div>

    {entries.length ? (
      <div className="activity-list">
        {entries.map((entry) => (
          <article className="activity-item" key={entry.id}>
            <div className="activity-item__main">
              <div className="activity-item__icon">{getEntryIcon(entry.reason, entry.type)}</div>
              <div>
                <p className="activity-item__reason">{entry.reason}</p>
                <p className="activity-item__time">
                  {entry.actorName ? `${entry.actorName} · ` : ''}
                  {formatTimestamp(entry.timestamp)}
                </p>
              </div>
            </div>
            <div
              className={`activity-item__points activity-item__points--${entry.type}`}
            >
              {formatPointsBadge(entry)}
            </div>
          </article>
        ))}
      </div>
    ) : (
      <div className="empty-state empty-state--soft">
        <h3>Nothing yet</h3>
        <p>Add the first Bestie Point to begin the activity list.</p>
      </div>
    )}
  </section>
)
