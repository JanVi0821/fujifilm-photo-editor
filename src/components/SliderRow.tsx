import type { CSSProperties } from 'react'

type SliderRowProps = {
  label: string
  value: number
  min: number
  max: number
  step: number
  displayValue: string
  onChange: (value: number) => void
  onAdjustStart?: () => void
  onAdjustEnd?: () => void
  disabled?: boolean
}

export function SliderRow({
  label,
  value,
  min,
  max,
  step,
  displayValue,
  onChange,
  onAdjustStart,
  onAdjustEnd,
  disabled = false,
}: SliderRowProps) {
  const percent = max === min ? 50 : ((value - min) / (max - min)) * 100

  return (
    <div className={`slider-row ${disabled ? 'disabled' : ''}`}>
      <span className="slider-label">{label}</span>
      <div className="slider-input-wrap">
        <input
          type="range"
          className="param-slider"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          onPointerDown={onAdjustStart}
          onPointerUp={onAdjustEnd}
          onPointerLeave={onAdjustEnd}
          onTouchStart={onAdjustStart}
          onTouchEnd={onAdjustEnd}
          style={{ '--slider-percent': `${percent}%` } as CSSProperties}
        />
      </div>
      <span className="slider-value">{displayValue}</span>
    </div>
  )
}
