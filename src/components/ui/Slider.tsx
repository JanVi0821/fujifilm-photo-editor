import * as RadixSlider from '@radix-ui/react-slider'

type SliderProps = {
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
  onAdjustStart?: () => void
  onAdjustEnd?: () => void
  disabled?: boolean
  orientation?: 'horizontal' | 'vertical'
  className?: string
  'aria-label'?: string
}

export function Slider({
  value,
  min,
  max,
  step,
  onChange,
  onAdjustStart,
  onAdjustEnd,
  disabled = false,
  orientation = 'horizontal',
  className = '',
  'aria-label': ariaLabel,
}: SliderProps) {
  return (
    <RadixSlider.Root
      className={`relative flex touch-none select-none items-center data-[orientation=horizontal]:h-5 data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-5 data-[orientation=vertical]:flex-col ${className}`}
      value={[value]}
      min={min}
      max={max}
      step={step}
      orientation={orientation}
      disabled={disabled}
      onValueChange={(vals) => onChange(vals[0])}
      onValueCommit={() => onAdjustEnd?.()}
      onPointerDown={() => onAdjustStart?.()}
      aria-label={ariaLabel}
    >
      <RadixSlider.Track className="relative grow rounded-full bg-border-light data-[orientation=horizontal]:h-[3px] data-[orientation=vertical]:w-[3px]">
        <RadixSlider.Range className="absolute rounded-full bg-fg data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full" />
      </RadixSlider.Track>
      <RadixSlider.Thumb
        className="block h-[18px] w-[18px] cursor-grab rounded-full bg-fg shadow-[0_1px_3px_rgba(0,0,0,0.45)] outline-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-fg/60 active:scale-110 active:cursor-grabbing data-disabled:cursor-not-allowed md:h-4 md:w-4"
        aria-label={ariaLabel}
      />
    </RadixSlider.Root>
  )
}
