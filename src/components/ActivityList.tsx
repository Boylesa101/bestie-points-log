import { formatPointsBadge, formatTimestamp } from '../lib/format'
import type { HistoryEntry } from '../types/app'

interface ActivityListProps {
  entries: HistoryEntry[]
  onViewAll?: () => void
  title?: string
}

export const ActivityList = ({
  entries,
  onViewAll,
  title = 'Recent activity',
}: ActivityListProps) => (
  <section className="surface-card">
    <div className="section-heading">
      <div>
        <p className="section-heading__eyebrow">Today’s moments</p>
        <h3>{title}</h3>
      </div>
      {onViewAll ? (
        <button className="soft-button" onClick={onViewAll} type="button">
          View all
        </button>
      ) : null}
    </div>

    {entries.length ? (
      <div className="activity-list">
        {entries.map((entry) => (
          <article className="activity-item" key={entry.id}>
            <div>
              <p className="activity-item__reason">{entry.reason}</p>
              <p className="activity-item__time">{formatTimestamp(entry.timestamp)}</p>
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
      <div className="empty-state">
        <h3>Nothing yet</h3>
        <p>Add the first Bestie Point to begin the activity list.</p>
      </div>
    )}
  </section>
)
