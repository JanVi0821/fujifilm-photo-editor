import {
  ADJUSTMENT_RANGES,
  isDefaultAdjustments,
  type ImageAdjustments,
} from '../constants/adjustments'
import { Histogram } from './Histogram'
import { HslSection } from './HslSection'
import { SliderRow } from './SliderRow'

type EditingPanelProps = {
  adjustments: ImageAdjustments
  histogramBins: number[]
  onAdjustmentsChange: (next: ImageAdjustments) => void
  eyedropperActive: boolean
  onEyedropperActiveChange: (active: boolean) => void
  onReset: () => void
  onAdjustStart: () => void
  onAdjustEnd: () => void
}

function formatExposure(value: number) {
  const rounded = Math.round(value * 100) / 100
  if (rounded > 0) return `+${rounded.toFixed(2)}`
  return rounded.toFixed(2)
}

function formatSignedInt(value: number) {
  if (value > 0) return `+${value}`
  return String(value)
}

export function EditingPanel({
  adjustments,
  histogramBins,
  onAdjustmentsChange,
  eyedropperActive,
  onEyedropperActiveChange,
  onReset,
  onAdjustStart,
  onAdjustEnd,
}: EditingPanelProps) {
  const canReset = !isDefaultAdjustments(adjustments)

  const update = (key: keyof Omit<ImageAdjustments, 'hsl'>, value: number) => {
    onAdjustmentsChange({ ...adjustments, [key]: value })
  }

  const updateHsl = (hsl: ImageAdjustments['hsl']) => {
    onAdjustmentsChange({ ...adjustments, hsl })
  }

  const sliderHandlers = { onAdjustStart, onAdjustEnd }

  return (
    <aside className="editing-panel">
      <div className="panel-header">
        <span>EDITING PANEL</span>
        <button
          className="icon-btn-sm"
          disabled={!canReset}
          onClick={onReset}
          title="Reset all adjustments"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>
      </div>

      <Histogram bins={histogramBins} />

      <div className="panel-sections">
        <div className="panel-section">
          <div className="section-title">
            <span>BASIC</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
          <div className="section-items">
            <SliderRow
              label="Exposure"
              value={adjustments.exposure}
              min={ADJUSTMENT_RANGES.exposure.min}
              max={ADJUSTMENT_RANGES.exposure.max}
              step={ADJUSTMENT_RANGES.exposure.step}
              displayValue={formatExposure(adjustments.exposure)}
              onChange={(v) => update('exposure', v)}
              {...sliderHandlers}
            />
            <SliderRow
              label="Contrast"
              value={adjustments.contrast}
              min={ADJUSTMENT_RANGES.contrast.min}
              max={ADJUSTMENT_RANGES.contrast.max}
              step={ADJUSTMENT_RANGES.contrast.step}
              displayValue={formatSignedInt(adjustments.contrast)}
              onChange={(v) => update('contrast', v)}
              {...sliderHandlers}
            />
            <SliderRow
              label="Saturation"
              value={adjustments.saturation}
              min={ADJUSTMENT_RANGES.saturation.min}
              max={ADJUSTMENT_RANGES.saturation.max}
              step={ADJUSTMENT_RANGES.saturation.step}
              displayValue={formatSignedInt(adjustments.saturation)}
              onChange={(v) => update('saturation', v)}
              {...sliderHandlers}
            />
            <SliderRow
              label="Temperature"
              value={adjustments.temperature}
              min={ADJUSTMENT_RANGES.temperature.min}
              max={ADJUSTMENT_RANGES.temperature.max}
              step={ADJUSTMENT_RANGES.temperature.step}
              displayValue={`${adjustments.temperature}K`}
              onChange={(v) => update('temperature', v)}
              {...sliderHandlers}
            />
            <SliderRow
              label="Tint"
              value={adjustments.tint}
              min={ADJUSTMENT_RANGES.tint.min}
              max={ADJUSTMENT_RANGES.tint.max}
              step={ADJUSTMENT_RANGES.tint.step}
              displayValue={formatSignedInt(adjustments.tint)}
              onChange={(v) => update('tint', v)}
              {...sliderHandlers}
            />
          </div>
        </div>

        <div className="panel-section">
          <div className="section-title">
            <span>LIGHTING</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
          <div className="section-items">
            <SliderRow
              label="Highlights"
              value={adjustments.highlights}
              min={ADJUSTMENT_RANGES.highlights.min}
              max={ADJUSTMENT_RANGES.highlights.max}
              step={ADJUSTMENT_RANGES.highlights.step}
              displayValue={formatSignedInt(adjustments.highlights)}
              onChange={(v) => update('highlights', v)}
              {...sliderHandlers}
            />
            <SliderRow
              label="Shadows"
              value={adjustments.shadows}
              min={ADJUSTMENT_RANGES.shadows.min}
              max={ADJUSTMENT_RANGES.shadows.max}
              step={ADJUSTMENT_RANGES.shadows.step}
              displayValue={formatSignedInt(adjustments.shadows)}
              onChange={(v) => update('shadows', v)}
              {...sliderHandlers}
            />
            <SliderRow
              label="Whites"
              value={adjustments.whites}
              min={ADJUSTMENT_RANGES.whites.min}
              max={ADJUSTMENT_RANGES.whites.max}
              step={ADJUSTMENT_RANGES.whites.step}
              displayValue={formatSignedInt(adjustments.whites)}
              onChange={(v) => update('whites', v)}
              {...sliderHandlers}
            />
            <SliderRow
              label="Blacks"
              value={adjustments.blacks}
              min={ADJUSTMENT_RANGES.blacks.min}
              max={ADJUSTMENT_RANGES.blacks.max}
              step={ADJUSTMENT_RANGES.blacks.step}
              displayValue={formatSignedInt(adjustments.blacks)}
              onChange={(v) => update('blacks', v)}
              {...sliderHandlers}
            />
          </div>
        </div>

        <div className="panel-section">
          <div className="section-title">
            <span>HSL / COLOR</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
          <div className="section-items">
            <HslSection
              hsl={adjustments.hsl}
              onChange={updateHsl}
              eyedropperActive={eyedropperActive}
              onEyedropperActiveChange={onEyedropperActiveChange}
              onAdjustStart={onAdjustStart}
              onAdjustEnd={onAdjustEnd}
            />
          </div>
        </div>
      </div>
    </aside>
  )
}
