import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

import { parseCube, sampleLUT, type CubeLUT } from './lut/cube'

type FilterId =
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

const FILTERS: Array<{ id: FilterId; name: string; cubeUrl: string; color: string }> = [
  { id: 'provia', name: 'Provia', cubeUrl: '/luts/abpy-srgb/provia_sRGB.cube', color: '#e8ecef' },
  { id: 'velvia', name: 'Velvia', cubeUrl: '/luts/abpy-srgb/velvia_sRGB.cube', color: '#d9e4d0' },
  { id: 'classic-chrome', name: 'Classic Chrome', cubeUrl: '/luts/abpy-srgb/classic chrome_sRGB.cube', color: '#c7ccd1' },
  { id: 'classic-neg', name: 'Classic Neg', cubeUrl: '/luts/abpy-srgb/classic neg_sRGB.cube', color: '#d1cdc3' },
  { id: 'nostalgic-neg', name: 'Nostalgic Neg', cubeUrl: '/luts/abpy-srgb/nostalgic neg_sRGB.cube', color: '#d4c7b8' },
  { id: 'astia', name: 'Astia', cubeUrl: '/luts/abpy-srgb/astia_sRGB.cube', color: '#e2d7d0' },
  { id: 'eterna', name: 'Eterna', cubeUrl: '/luts/abpy-srgb/eterna_sRGB.cube', color: '#c6cac8' },
  { id: 'bleach-bypass', name: 'Bleach Bypass', cubeUrl: '/luts/abpy-srgb/bleach bypass_sRGB.cube', color: '#c2c4c1' },
  { id: 'pro-neg-std', name: 'Pro Neg Std', cubeUrl: '/luts/abpy-srgb/pro neg std_sRGB.cube', color: '#e1e3de' },
  { id: 'pro-neg-hi', name: 'Pro Neg Hi', cubeUrl: '/luts/abpy-srgb/pro neg hi_sRGB.cube', color: '#dde0dd' },
  { id: 'reala-ace', name: 'Reala Ace', cubeUrl: '/luts/abpy-srgb/reala ace_sRGB.cube', color: '#d7dcd8' },
]

function App() {
  const [file, setFile] = useState<File | null>(null)
  const [filter, setFilter] = useState<FilterId>('classic-neg')
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [lutCache, setLutCache] = useState<Record<string, CubeLUT>>({})

  const imgRef = useRef<HTMLImageElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const imageUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl)
    }
  }, [imageUrl])

  const loadLUT = async (filterId: FilterId) => {
    if (lutCache[filterId]) return lutCache[filterId]
    const f = FILTERS.find((x) => x.id === filterId)
    if (!f) throw new Error(`Unknown filter: ${filterId}`)

    const res = await fetch(f.cubeUrl)
    if (!res.ok) throw new Error(`LUT 加载失败: ${res.status} ${res.statusText}`)
    const text = await res.text()
    const lut = parseCube(text)

    setLutCache((prev) => ({ ...prev, [filterId]: lut }))
    return lut
  }

  const applyFilterToCanvas = async () => {
    const img = imgRef.current
    const canvas = canvasRef.current
    if (!img || !canvas) return

    setIsProcessing(true)

    try {
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) throw new Error('Cannot get 2D context')

      const w = img.naturalWidth
      const h = img.naturalHeight
      if (!w || !h) return

      canvas.width = w
      canvas.height = h
      ctx.clearRect(0, 0, w, h)
      ctx.drawImage(img, 0, 0, w, h)

      const lut = await loadLUT(filter)

      await new Promise((r) => setTimeout(r, 50))

      const imageData = ctx.getImageData(0, 0, w, h)
      const d = imageData.data

      for (let i = 0; i < d.length; i += 4) {
        const r = d[i] / 255
        const g = d[i + 1] / 255
        const b = d[i + 2] / 255

        const [nr, ng, nb] = sampleLUT(lut, r, g, b)

        d[i] = Math.round(nr * 255)
        d[i + 1] = Math.round(ng * 255)
        d[i + 2] = Math.round(nb * 255)
      }

      ctx.putImageData(imageData, 0, 0)
    } finally {
      setIsProcessing(false)
    }
  }

  useEffect(() => {
    if (file) {
      applyFilterToCanvas().catch((e) => {
        setError(e instanceof Error ? e.message : String(e))
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, file])

  const onPickFile = (f: File | null) => {
    setError(null)
    setFile(f)
  }

  const onDownload = async () => {
    try {
      setError(null)
      const canvas = canvasRef.current
      if (!canvas) return

      await new Promise<void>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error('导出失败：无法生成图片'))
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `fuji-${filter}.png`
            document.body.appendChild(a)
            a.click()
            a.remove()
            URL.revokeObjectURL(url)
            resolve()
          },
          'image/png',
          1,
        )
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const MenuIcon = (
    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12"></line>
      <line x1="3" y1="6" x2="21" y2="6"></line>
      <line x1="3" y1="18" x2="21" y2="18"></line>
    </svg>
  )

  const DownloadIcon = (
    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
      <polyline points="7 10 12 15 17 10"></polyline>
      <line x1="12" y1="15" x2="12" y2="3"></line>
    </svg>
  )

  const HomeIcon = (
    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
      <circle cx="8.5" cy="8.5" r="1.5"></circle>
      <polyline points="21 15 16 10 5 21"></polyline>
    </svg>
  )

  const UploadIcon = (
    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  )

  const SettingsIcon = (
    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"></circle>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
    </svg>
  )

  return (
    <div className="app-container">
      <header className="top-nav">
        <button className="icon-btn">{MenuIcon}</button>
        <div className="nav-title">FUJI FILM</div>
        <button className="icon-btn" onClick={onDownload} disabled={!imageUrl || isProcessing}>
          {DownloadIcon}
        </button>
      </header>

      <main className="main-content">
        <div className="polaroid-wrapper">
          <div className="polaroid">
            {!imageUrl ? (
              <label className="upload-placeholder">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
                  style={{ display: 'none' }}
                />
                <div>{UploadIcon}</div>
                <span>Tap to Upload</span>
              </label>
            ) : (
              <div className="canvas-container" style={{ opacity: isProcessing ? 0.6 : 1 }}>
                <img
                  ref={imgRef}
                  src={imageUrl}
                  alt="source"
                  style={{ display: 'none' }}
                  onLoad={() => {
                    applyFilterToCanvas().catch((e) => {
                      setError(e instanceof Error ? e.message : String(e))
                    })
                  }}
                />
                <canvas ref={canvasRef} className="render-canvas" />
                {isProcessing && (
                  <div className="loader-overlay">
                    <div className="loader-text">Processing...</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {error && <div className="error-toast">{error}</div>}

        <div className="filter-section">
          <div className="section-tabs">
            <span className="active">FILTERS</span>
            <span>MOOD</span>
          </div>
          
          <div className="filter-scroll">
            {FILTERS.map((f) => (
              <div
                key={f.id}
                className={`filter-item ${f.id === filter ? 'active' : ''}`}
                onClick={() => setFilter(f.id)}
              >
                <div className="filter-thumb" style={{ backgroundColor: f.color }}></div>
                <div className="filter-name">{f.name}</div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <nav className="bottom-nav">
        <button className="nav-item active">{HomeIcon}</button>
        <label className="nav-item">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
            style={{ display: 'none' }}
          />
          {UploadIcon}
        </label>
        <button className="nav-item">{SettingsIcon}</button>
      </nav>
    </div>
  )
}

export default App
