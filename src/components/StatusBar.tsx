import { FILTERS, type FilterId } from '../constants/filters'

type StatusBarProps = {
  filter: FilterId
  isDefaultImage: boolean
}

export function StatusBar({ filter, isDefaultImage }: StatusBarProps) {
  const filterName = FILTERS.find((f) => f.id === filter)?.name ?? filter

  return (
    <footer className="status-bar">
      <div className="status-meta">
        {isDefaultImage ? (
          <>
          </>
        ) : null}
        <span>{filterName}</span>
      </div>
    </footer>
  )
}
