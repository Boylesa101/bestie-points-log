import { ActivityList } from '../components/ActivityList'
import type { HistoryEntry } from '../types/app'

interface HistoryScreenProps {
  entries: HistoryEntry[]
  onBack: () => void
}

export const HistoryScreen = ({ entries, onBack }: HistoryScreenProps) => (
  <main className="screen">
    <header className="subscreen__header">
      <div>
        <p className="subscreen__eyebrow">Log book</p>
        <h1 className="subscreen__title">All activity</h1>
        <p className="subscreen__lead">Every Bestie Points action, with who made the change and when.</p>
      </div>

      <button className="back-button" onClick={onBack} type="button">
        ←
      </button>
    </header>

    <div className="subscreen-stack">
      <ActivityList entries={entries} title="Activity history" />
    </div>
  </main>
)
