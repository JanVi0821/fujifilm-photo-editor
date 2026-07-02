export type FilterId =
  | 'none'
  | 'provia'
  | 'velvia'
  | 'classic-chrome'
  | 'classic-neg'
  | 'nostalgic-neg'
  | 'astia'
  | 'eterna'
  | 'bleach-bypass'
  | 'pro-neg-std'
  | 'pro-neg-hi'
  | 'reala-ace'

export type FilterDef = {
  id: FilterId
  name: string
  abbr: string
  cubeUrl?: string
}

export const FILTERS: FilterDef[] = [
  { id: 'none', name: 'None', abbr: 'OFF' },
  { id: 'provia', name: 'Provia', abbr: 'PRV', cubeUrl: '/luts/abpy-srgb/provia_sRGB.cube' },
  { id: 'velvia', name: 'Velvia', abbr: 'VEL', cubeUrl: '/luts/abpy-srgb/velvia_sRGB.cube' },
  { id: 'classic-chrome', name: 'Classic Chrome', abbr: 'CC', cubeUrl: '/luts/abpy-srgb/classic chrome_sRGB.cube' },
  { id: 'classic-neg', name: 'Classic Neg', abbr: 'CN', cubeUrl: '/luts/abpy-srgb/classic neg_sRGB.cube' },
  { id: 'nostalgic-neg', name: 'Nostalgic Neg', abbr: 'NN', cubeUrl: '/luts/abpy-srgb/nostalgic neg_sRGB.cube' },
  { id: 'astia', name: 'Astia', abbr: 'AST', cubeUrl: '/luts/abpy-srgb/astia_sRGB.cube' },
  { id: 'eterna', name: 'Eterna', abbr: 'ETR', cubeUrl: '/luts/abpy-srgb/eterna_sRGB.cube' },
  { id: 'bleach-bypass', name: 'Bleach Bypass', abbr: 'BB', cubeUrl: '/luts/abpy-srgb/bleach bypass_sRGB.cube' },
  { id: 'pro-neg-std', name: 'Pro Neg Std', abbr: 'PNS', cubeUrl: '/luts/abpy-srgb/pro neg std_sRGB.cube' },
  { id: 'pro-neg-hi', name: 'Pro Neg Hi', abbr: 'PNH', cubeUrl: '/luts/abpy-srgb/pro neg hi_sRGB.cube' },
  { id: 'reala-ace', name: 'Reala Ace', abbr: 'RA', cubeUrl: '/luts/abpy-srgb/reala ace_sRGB.cube' },
]

export const DEFAULT_FILTER: FilterId = 'none'
export const DEFAULT_IMAGE_URL = '/sample.jpg'

export function hasLutFilter(id: FilterId): boolean {
  return id !== 'none'
}
