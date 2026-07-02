import { FILTERS, hasLutFilter, type FilterId } from '../constants/filters'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { Slider } from './ui/Slider'

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
  const isDesktop = useMediaQuery('(min-width: 768px)')

  return (
    <aside className="order-2 flex w-full shrink-0 flex-col border-b border-border bg-panel md:order-0 md:w-[88px] md:min-h-0 md:overflow-hidden md:border-b-0 md:border-r">
      <div className="hidden shrink-0 text-[9px] font-semibold tracking-[0.12em] text-fg-muted md:flex md:flex-col md:items-center md:gap-1.5 md:border-b md:border-border md:px-2 md:pb-3 md:pt-4">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 20h18M5 20V10l7-7 7 7v10" />
        </svg>
        <span>PRESETS</span>
      </div>

      <div className="flex shrink-0 flex-row gap-1 overflow-x-auto p-2 md:min-h-0 md:flex-1 md:flex-col md:overflow-x-hidden md:overflow-y-auto md:px-1.5 md:py-2">
        {FILTERS.map((f) => {
          const active = f.id === filter
          return (
            <button
              key={f.id}
              className={`flex shrink-0 cursor-pointer flex-col items-center gap-1 rounded-[2px] border px-1 py-2.5 transition-colors md:w-full ${
                active
                  ? 'border-border-light bg-elevated text-fg'
                  : 'border-transparent bg-transparent text-fg-secondary hover:bg-hover hover:text-fg'
              }`}
              onClick={() => onFilterChange(f.id)}
              title={f.name}
            >
              <span className="text-[11px] font-bold tracking-[0.06em]">{f.abbr}</span>
              <span
                className={`max-w-[72px] overflow-hidden text-ellipsis whitespace-nowrap text-center text-[7px] leading-[1.2] tracking-[0.04em] ${
                  active ? 'text-fg-secondary' : 'text-fg-muted'
                }`}
              >
                {f.name}
              </span>
            </button>
          )
        })}
      </div>

      <div
        className={`flex shrink-0 flex-row items-center gap-3 border-t border-border px-3 py-3 md:flex-col md:items-center md:gap-2.5 md:px-2 md:py-4 ${
          strengthDisabled ? 'opacity-40' : ''
        }`}
      >
        <span className="shrink-0 text-[8px] font-semibold tracking-[0.12em] text-fg-muted">
          STRENGTH
        </span>
        <div className="flex flex-1 items-center gap-2 md:flex-none md:flex-col">
          <Slider
            value={strength}
            min={0}
            max={100}
            step={1}
            disabled={strengthDisabled}
            orientation={isDesktop ? 'vertical' : 'horizontal'}
            className={isDesktop ? 'h-[100px]' : 'flex-1'}
            onChange={onStrengthChange}
            onAdjustStart={onAdjustStart}
            onAdjustEnd={onAdjustEnd}
            aria-label="Filter strength"
          />
          <span className="text-[10px] font-semibold tracking-[0.04em] text-fg-secondary">
            {strengthDisabled ? '—' : `${strength}%`}
          </span>
        </div>
      </div>
    </aside>
  )
}
