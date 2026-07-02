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
  const trackBg = `linear-gradient(to right, var(--color-fg) 0%, var(--color-fg) ${percent}%, var(--color-border-light) ${percent}%, var(--color-border-light) 100%)`

  return (
    <div
      className={`grid grid-cols-[80px_1fr_36px] items-center gap-2.5 ${disabled ? 'opacity-45' : ''}`}
    >
      <span className="text-[10px] tracking-[0.04em] text-fg-secondary">{label}</span>
      <div className="relative flex h-4 items-center">
        <input
          type="range"
          className={`h-[2px] w-full cursor-pointer appearance-none rounded-[1px] outline-none disabled:cursor-not-allowed [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-fg [&::-moz-range-thumb]:h-2.5 [&::-moz-range-thumb]:w-2.5 [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-fg`}
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
          style={{ background: trackBg }}
        />
      </div>
      <span className="text-right text-[10px] text-fg-muted">{displayValue}</span>
    </div>
  )
}
