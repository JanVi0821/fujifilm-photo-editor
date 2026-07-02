import { FILTERS, type FilterId } from '../constants/filters'

type StatusBarProps = {
  filter: FilterId
  isDefaultImage: boolean
  className?: string
}

export function StatusBar({ filter, isDefaultImage, className = '' }: StatusBarProps) {
  const filterName = FILTERS.find((f) => f.id === filter)?.name ?? filter

  return (
    <footer
      className={`flex h-[36px] shrink-0 items-center justify-between border-t border-border bg-panel px-4 text-[10px] tracking-[0.06em] text-fg-muted md:px-6 ${className}`}
    >
      <div className="flex items-center gap-2">
        {isDefaultImage ? <></> : null}
        <span>{filterName}</span>
      </div>
    </footer>
  )
}
