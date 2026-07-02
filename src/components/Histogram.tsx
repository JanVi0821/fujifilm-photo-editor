import { histogramToSvgPath } from '../image/histogram'

type HistogramProps = {
  bins: number[]
}

export function Histogram({ bins }: HistogramProps) {
  const path = histogramToSvgPath(bins, 200, 60)
  const hasData = bins.some((count) => count > 0)

  return (
    <div className="histogram">
      <svg viewBox="0 0 200 60" preserveAspectRatio="none" className="histogram-svg">
        {hasData ? (
          <polyline
            points={path}
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        ) : (
          <line x1="0" y1="59" x2="200" y2="59" stroke="currentColor" strokeWidth="1" opacity="0.3" />
        )}
      </svg>
    </div>
  )
}
