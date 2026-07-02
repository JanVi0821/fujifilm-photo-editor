import { type CSSProperties } from 'react'

import {
  HSL_ADJUSTMENT_RANGE,
  HSL_HUE_RANGE,
  MAX_HSL_TARGETS,
  type HslSettings,
  type HslTarget,
} from '../constants/hsl'
import { SliderRow } from './SliderRow'

type HslSectionProps = {
  hsl: HslSettings
  onChange: (next: HslSettings) => void
  eyedropperActive: boolean
  onEyedropperActiveChange: (active: boolean) => void
  onAdjustStart: () => void
  onAdjustEnd: () => void
}

function formatSignedInt(value: number) {
  if (value > 0) return `+${value}`
  return String(value)
}

export function HslSection({
  hsl,
  onChange,
  eyedropperActive,
  onEyedropperActiveChange,
  onAdjustStart,
  onAdjustEnd,
}: HslSectionProps) {
  const selected =
    hsl.targets.find((t) => t.id === hsl.selectedId) ?? hsl.targets[0] ?? null

  const updateTarget = (id: string, patch: Partial<HslTarget>) => {
    onChange({
      ...hsl,
      targets: hsl.targets.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    })
  }

  const selectTarget = (id: string) => {
    onChange({ ...hsl, selectedId: id })
    onEyedropperActiveChange(false)
  }

  const removeTarget = (id: string) => {
    const nextTargets = hsl.targets.filter((t) => t.id !== id)
    const nextSelected =
      hsl.selectedId === id ? (nextTargets[0]?.id ?? null) : hsl.selectedId

    onChange({ targets: nextTargets, selectedId: nextSelected })
  }

  const toggleEyedropper = () => {
    if (hsl.targets.length >= MAX_HSL_TARGETS && !eyedropperActive) return
    onEyedropperActiveChange(!eyedropperActive)
  }

  const sliderHandlers = { onAdjustStart, onAdjustEnd }
  const atMaxTargets = hsl.targets.length >= MAX_HSL_TARGETS

  return (
    <div className="hsl-section">
      <div className="hsl-picker-row">
        <button
          type="button"
          className={`hsl-eyedropper-btn ${eyedropperActive ? 'active' : ''}`}
          onClick={toggleEyedropper}
          disabled={atMaxTargets && !eyedropperActive}
          title={atMaxTargets ? `Up to ${MAX_HSL_TARGETS} color targets` : 'Pick a color from the image'}
          aria-label="Pick a color from the image"
          aria-pressed={eyedropperActive}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m2 22 1-1h3l9.5-9.5a2.1 2.1 0 0 0 0-3L16 3.5a2.1 2.1 0 0 0-3 0L3.5 13 2 22Z" />
            <path d="m12.5 6.5 5 5" />
          </svg>
        </button>
        {eyedropperActive && (
          <span className="hsl-eyedropper-hint">Click the image to add a target</span>
        )}
        {!eyedropperActive && hsl.targets.length === 0 && (
          <span className="hsl-empty-hint">Use the eyedropper to pick a color</span>
        )}
        {atMaxTargets && !eyedropperActive && (
          <span className="hsl-empty-hint">Limit reached: {MAX_HSL_TARGETS}</span>
        )}
      </div>

      {hsl.targets.length > 0 && (
        <div className="hsl-target-list">
          {hsl.targets.map((target) => (
            <div key={target.id} className="hsl-target-item">
              <button
                type="button"
                className={`hsl-swatch hsl-target-swatch ${selected?.id === target.id ? 'active' : ''}`}
                style={{ '--swatch-color': target.pickedHex } as CSSProperties}
                onClick={() => selectTarget(target.id)}
                title={target.pickedHex}
                aria-label={`Color target ${target.pickedHex}`}
              />
              <button
                type="button"
                className="hsl-target-remove"
                onClick={() => removeTarget(target.id)}
                title="Remove this color target"
                aria-label="Remove this color target"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <>
          <div className="hsl-selected-label">
            {selected.pickedHex.toUpperCase()} · ±{selected.hueRange}°
          </div>

          <div className="section-items">
            <SliderRow
              label="Range"
              value={selected.hueRange}
              min={HSL_HUE_RANGE.min}
              max={HSL_HUE_RANGE.max}
              step={HSL_HUE_RANGE.step}
              displayValue={`±${selected.hueRange}°`}
              onChange={(v) => updateTarget(selected.id, { hueRange: v })}
              {...sliderHandlers}
            />
            <SliderRow
              label="Hue"
              value={selected.hue}
              min={HSL_ADJUSTMENT_RANGE.min}
              max={HSL_ADJUSTMENT_RANGE.max}
              step={HSL_ADJUSTMENT_RANGE.step}
              displayValue={formatSignedInt(selected.hue)}
              onChange={(v) => updateTarget(selected.id, { hue: v })}
              {...sliderHandlers}
            />
            <SliderRow
              label="Saturation"
              value={selected.saturation}
              min={HSL_ADJUSTMENT_RANGE.min}
              max={HSL_ADJUSTMENT_RANGE.max}
              step={HSL_ADJUSTMENT_RANGE.step}
              displayValue={formatSignedInt(selected.saturation)}
              onChange={(v) => updateTarget(selected.id, { saturation: v })}
              {...sliderHandlers}
            />
            <SliderRow
              label="Luminance"
              value={selected.luminance}
              min={HSL_ADJUSTMENT_RANGE.min}
              max={HSL_ADJUSTMENT_RANGE.max}
              step={HSL_ADJUSTMENT_RANGE.step}
              displayValue={formatSignedInt(selected.luminance)}
              onChange={(v) => updateTarget(selected.id, { luminance: v })}
              {...sliderHandlers}
            />
          </div>
        </>
      )}
    </div>
  )
}
