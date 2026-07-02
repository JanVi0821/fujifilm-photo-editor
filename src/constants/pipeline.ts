export type PipelineStageId = 'filter' | 'color'

export type PipelineOrder = PipelineStageId[]

export type PipelineStageDef = {
  id: PipelineStageId
  name: string
  description: string
}

export const PIPELINE_STAGES: Record<PipelineStageId, PipelineStageDef> = {
  filter: {
    id: 'filter',
    name: 'Film Simulation',
    description: 'LUT filter and strength blend',
  },
  color: {
    id: 'color',
    name: 'Color & Tone',
    description: 'Exposure, tone, temperature and HSL',
  },
}

export const DEFAULT_PIPELINE_ORDER: PipelineOrder = ['filter', 'color']

export function isColorFirst(order: PipelineOrder): boolean {
  return order[0] === 'color'
}

export function moveStage(
  order: PipelineOrder,
  index: number,
  direction: -1 | 1,
): PipelineOrder {
  const target = index + direction
  if (target < 0 || target >= order.length) return order

  const next = [...order]
  const [moved] = next.splice(index, 1)
  next.splice(target, 0, moved)
  return next
}
