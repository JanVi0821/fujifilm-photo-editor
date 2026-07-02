import { FILTERS, hasLutFilter, type FilterId } from '../constants/filters'

type LeftSidebarProps = {
  filter: FilterId
  strength: number
  onFilterChange: (id: FilterId) => void
  onStrengthChange: (value: number) => void
  onAdjustStart: () => void
  onAdjustEnd: () => void
}

export function LeftSidebar({
  filter,
  strength,
  onFilterChange,
  onStrengthChange,
  onAdjustStart,
  onAdjustEnd,
}: LeftSidebarProps) {
  const strengthDisabled = !hasLutFilter(filter)

  return (
    <aside className="left-sidebar">
      <div className="sidebar-header">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 20h18M5 20V10l7-7 7 7v10" />
        </svg>
        <span>PRESETS</span>
      </div>

      <div className="preset-list">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            className={`preset-btn ${f.id === filter ? 'active' : ''}`}
            onClick={() => onFilterChange(f.id)}
            title={f.name}
          >
            <span className="preset-abbr">{f.abbr}</span>
            <span className="preset-name">{f.name}</span>
          </button>
        ))}
      </div>

      <div className={`strength-section ${strengthDisabled ? 'disabled' : ''}`}>
        <span className="strength-label">STRENGTH</span>
        <div className="strength-control">
          <input
            type="range"
            className="strength-slider"
            min={0}
            max={100}
            value={strength}
            disabled={strengthDisabled}
            onChange={(e) => onStrengthChange(Number(e.target.value))}
            onPointerDown={onAdjustStart}
            onPointerUp={onAdjustEnd}
            onPointerLeave={onAdjustEnd}
            onTouchStart={onAdjustStart}
            onTouchEnd={onAdjustEnd}
            aria-label="Filter strength"
          />
          <span className="strength-value">{strengthDisabled ? '—' : `${strength}%`}</span>
        </div>
      </div>
    </aside>
  )
}
