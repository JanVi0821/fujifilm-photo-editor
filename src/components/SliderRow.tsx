import { Slider } from './ui/Slider'

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
  return (
    <div
      className={`grid grid-cols-[80px_1fr_36px] items-center gap-2.5 ${disabled ? 'opacity-45' : ''}`}
    >
      <span className="text-[10px] tracking-[0.04em] text-fg-secondary">{label}</span>
      <Slider
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={onChange}
        onAdjustStart={onAdjustStart}
        onAdjustEnd={onAdjustEnd}
        aria-label={label}
      />
      <span className="text-right text-[10px] text-fg-muted">{displayValue}</span>
    </div>
  )
}
