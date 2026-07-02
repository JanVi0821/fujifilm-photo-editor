import {
  ADJUSTMENT_RANGES,
  isDefaultAdjustments,
  type ImageAdjustments,
} from '../constants/adjustments'
import {
  PIPELINE_STAGES,
  moveStage,
  type PipelineOrder,
} from '../constants/pipeline'
import { Histogram } from './Histogram'
import { HslSection } from './HslSection'
import { SliderRow } from './SliderRow'

type EditingPanelProps = {
  adjustments: ImageAdjustments
  histogramBins: number[]
  pipelineOrder: PipelineOrder
  onPipelineOrderChange: (order: PipelineOrder) => void
  onAdjustmentsChange: (next: ImageAdjustments) => void
  eyedropperActive: boolean
  onEyedropperActiveChange: (active: boolean) => void
  onReset: () => void
  onAdjustStart: () => void
  onAdjustEnd: () => void
}

const SECTION_TITLE =
  'flex items-center justify-between border-b border-border pb-2 mb-3 text-[10px] font-semibold tracking-[0.12em] text-fg-secondary'

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
  pipelineOrder,
  onPipelineOrderChange,
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
    <aside className="order-3 flex w-full shrink-0 flex-col border-t border-border bg-panel md:order-0 md:w-[300px] md:min-h-0 md:shrink md:overflow-hidden md:border-l md:border-t-0">
      <div className="flex shrink-0 items-center justify-between px-5 pb-3 pt-4 text-[10px] font-semibold tracking-[0.14em] text-fg-secondary">
        <span>EDITING PANEL</span>
        <button
          className="flex cursor-pointer items-center border-0 bg-transparent p-1 text-fg-muted transition-colors enabled:hover:text-fg disabled:cursor-not-allowed disabled:opacity-40"
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

      <div className="px-5 pb-5 md:min-h-0 md:flex-1 md:overflow-y-auto">
        <div className="mb-5">
          <div className={SECTION_TITLE}>
            <span>PIPELINE ORDER</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {pipelineOrder.map((stageId, index) => {
              const stage = PIPELINE_STAGES[stageId]
              return (
                <div
                  key={stageId}
                  className="flex items-center gap-2.5 rounded-md border border-border-light bg-elevated px-2.5 py-2"
                >
                  <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-fg text-[10px] font-bold text-panel">
                    {index + 1}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-[11px] font-semibold text-fg">{stage.name}</span>
                    <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[9px] text-fg-muted">
                      {stage.description}
                    </span>
                  </div>
                  <div className="flex shrink-0 flex-col gap-0.5">
                    <button
                      type="button"
                      className="flex h-4 w-5 cursor-pointer items-center justify-center rounded border border-border-light bg-panel p-0 text-fg-secondary transition-colors enabled:hover:border-fg enabled:hover:bg-elevated enabled:hover:text-fg disabled:cursor-not-allowed disabled:opacity-30"
                      disabled={index === 0}
                      onClick={() => onPipelineOrderChange(moveStage(pipelineOrder, index, -1))}
                      title="Move up"
                      aria-label={`Move ${stage.name} up`}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="18 15 12 9 6 15" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="flex h-4 w-5 cursor-pointer items-center justify-center rounded border border-border-light bg-panel p-0 text-fg-secondary transition-colors enabled:hover:border-fg enabled:hover:bg-elevated enabled:hover:text-fg disabled:cursor-not-allowed disabled:opacity-30"
                      disabled={index === pipelineOrder.length - 1}
                      onClick={() => onPipelineOrderChange(moveStage(pipelineOrder, index, 1))}
                      title="Move down"
                      aria-label={`Move ${stage.name} down`}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="mb-5">
          <div className={SECTION_TITLE}>
            <span>BASIC</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
          <div className="flex flex-col gap-3.5">
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

        <div className="mb-5">
          <div className={SECTION_TITLE}>
            <span>LIGHTING</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
          <div className="flex flex-col gap-3.5">
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

        <div className="mb-5">
          <div className={SECTION_TITLE}>
            <span>HSL / COLOR</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
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
    </aside>
  )
}
