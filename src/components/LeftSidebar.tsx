import { FILTERS, hasLutFilter, type FilterId } from '../constants/filters'

type LeftSidebarProps = {
  filter: FilterId
  strength: number
  onFilterChange: (id: FilterId) => void
  onStrengthChange: (value: number) => void
  onAdjustStart: () => void
  onAdjustEnd: () => void
}

const STRENGTH_SLIDER =
  'appearance-none cursor-pointer bg-transparent w-full h-1 ' +
  'md:w-1 md:h-[100px] md:[writing-mode:vertical-lr] md:[direction:rtl] ' +
  '[&::-webkit-slider-runnable-track]:h-[2px] [&::-webkit-slider-runnable-track]:w-full [&::-webkit-slider-runnable-track]:rounded-[1px] [&::-webkit-slider-runnable-track]:bg-border-light ' +
  'md:[&::-webkit-slider-runnable-track]:w-[2px] md:[&::-webkit-slider-runnable-track]:h-[100px] ' +
  '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-fg [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:-mt-[5px] ' +
  'md:[&::-webkit-slider-thumb]:mt-0 md:[&::-webkit-slider-thumb]:-ml-[5px] ' +
  '[&::-moz-range-track]:h-[2px] [&::-moz-range-track]:rounded-[1px] [&::-moz-range-track]:bg-border-light md:[&::-moz-range-track]:w-[2px] md:[&::-moz-range-track]:h-[100px] ' +
  '[&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-fg [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-grab'

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
          <input
            type="range"
            className={`${STRENGTH_SLIDER} ${strengthDisabled ? 'cursor-not-allowed' : ''}`}
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
          <span className="text-[10px] font-semibold tracking-[0.04em] text-fg-secondary">
            {strengthDisabled ? '—' : `${strength}%`}
          </span>
        </div>
      </div>
    </aside>
  )
}
