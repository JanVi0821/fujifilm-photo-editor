import { useCallback, useEffect, useRef, useState } from 'react'

import type { ImageAdjustments } from '../constants/adjustments'
import { FILTERS, hasLutFilter, type FilterId } from '../constants/filters'
import { isColorFirst, type PipelineOrder } from '../constants/pipeline'
import { GpuRenderer, type RenderParams, type RenderQuality } from '../gpu/renderer'
import { applyImageAdjustments, blendPixels, copyImageData } from '../image/adjustments'
import {
  computeLuminanceHistogram,
  computeLuminanceHistogramFromPixels,
} from '../image/histogram'
import { parseCube, sampleLUT, type CubeLUT } from '../lut/cube'

type ImageSource =
  | { kind: 'default' }
  | { kind: 'upload'; file: File }

const HISTOGRAM_INTERVAL_MS = 300

function isImageReady(img: HTMLImageElement | null): img is HTMLImageElement {
  return !!img && img.complete && img.naturalWidth > 0 && img.naturalHeight > 0
}

function applyLutToImageData(input: ImageData, lut: CubeLUT): ImageData {
  const result = copyImageData(input)
  const d = result.data
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i] / 255
    const g = d[i + 1] / 255
    const b = d[i + 2] / 255
    const [nr, ng, nb] = sampleLUT(lut, r, g, b)
    d[i] = Math.round(nr * 255)
    d[i + 1] = Math.round(ng * 255)
    d[i + 2] = Math.round(nb * 255)
  }
  return result
}

export function useImageProcessing(
  imageSource: ImageSource,
  filter: FilterId,
  strength: number,
  adjustments: ImageAdjustments,
  pipelineOrder: PipelineOrder,
) {
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(() =>
    imageSource.kind === 'default' ? '/sample.jpg' : null,
  )
  const [histogramBins, setHistogramBins] = useState<number[]>([])
  const [gpuReady, setGpuReady] = useState(false)
  const pipelineReadyRef = useRef(false)

  const imgRef = useRef<HTMLImageElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const cpuCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const gpuRef = useRef<GpuRenderer | null>(null)
  const useGpuRef = useRef(true)
  const lutCacheRef = useRef<Record<string, CubeLUT>>({})
  const sourceDataRef = useRef<ImageData | null>(null)
  const lutRef = useRef<CubeLUT | null>(null)
  const filterRef = useRef(filter)
  const strengthRef = useRef(strength)
  const adjustmentsRef = useRef(adjustments)
  const colorFirstRef = useRef(isColorFirst(pipelineOrder))
  const isAdjustingRef = useRef(false)
  const lastHistogramAtRef = useRef(0)
  const pipelineGenRef = useRef(0)

  filterRef.current = filter
  strengthRef.current = strength
  adjustmentsRef.current = adjustments
  colorFirstRef.current = isColorFirst(pipelineOrder)

  useEffect(() => {
    if (imageSource.kind === 'default') {
      setImageUrl('/sample.jpg')
      return
    }

    const url = URL.createObjectURL(imageSource.file)
    setImageUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [imageSource])

  const ensureGpu = useCallback(() => {
    if (!useGpuRef.current || gpuRef.current || !canvasRef.current) return

    try {
      gpuRef.current = new GpuRenderer(canvasRef.current)
      setGpuReady(true)
    } catch {
      useGpuRef.current = false
      setGpuReady(false)
    }
  }, [])

  useEffect(() => {
    return () => {
      gpuRef.current?.destroy()
      gpuRef.current = null
    }
  }, [])

  const getQuality = (): RenderQuality =>
    isAdjustingRef.current ? 'preview' : 'full'

  const buildRenderParams = (): RenderParams => ({
    adj: adjustmentsRef.current,
    hasLut: lutRef.current !== null,
    strength: strengthRef.current,
    colorFirst: colorFirstRef.current,
  })

  // CPU fallback: run the full stage chain (order-aware) on an ImageData.
  const runCpuChain = useCallback((input: ImageData): ImageData => {
    const strengthVal = strengthRef.current
    const adj = adjustmentsRef.current
    const lut = lutRef.current

    const filterStage = (img: ImageData): ImageData => {
      if (!lut) return img
      const filtered = applyLutToImageData(img, lut)
      return blendPixels(img, filtered, strengthVal)
    }
    const colorStage = (img: ImageData): ImageData => applyImageAdjustments(img, adj)

    return colorFirstRef.current
      ? filterStage(colorStage(input))
      : colorStage(filterStage(input))
  }, [])

  const updateHistogram = useCallback(
    (force = false) => {
      const now = Date.now()
      if (!force && now - lastHistogramAtRef.current < HISTOGRAM_INTERVAL_MS) return
      lastHistogramAtRef.current = now

      const gpu = gpuRef.current
      if (gpu && useGpuRef.current) {
        const result = gpu.readScreenPixels()
        if (!result) return
        setHistogramBins(
          computeLuminanceHistogramFromPixels(result.data, result.width, result.height),
        )
        return
      }

      const source = sourceDataRef.current
      if (!source) return
      const preview = downscaleImageData(source)
      const output = runCpuChain(preview)
      setHistogramBins(computeLuminanceHistogram(output))
    },
    [runCpuChain],
  )

  const renderCpu = useCallback(
    (quality: RenderQuality) => {
      const source = sourceDataRef.current
      const canvas = canvasRef.current
      if (!source || !canvas) return

      const workInput = quality === 'preview' ? downscaleImageData(source) : source
      const output = runCpuChain(workInput)
      const display = quality === 'full' ? downscaleImageData(output) : output

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      canvas.width = display.width
      canvas.height = display.height
      ctx.putImageData(display, 0, 0)
      updateHistogram(false)
    },
    [runCpuChain, updateHistogram],
  )

  const renderGpu = useCallback(
    (quality: RenderQuality) => {
      const gpu = gpuRef.current
      if (!gpu) throw new Error('GPU renderer not ready')
      gpu.renderImage(buildRenderParams(), quality)
      updateHistogram(false)
    },
    [updateHistogram],
  )

  const render = useCallback(
    (quality: RenderQuality) => {
      if (gpuRef.current && useGpuRef.current) {
        renderGpu(quality)
      } else {
        renderCpu(quality)
      }
    },
    [renderCpu, renderGpu],
  )

  const loadLUT = useCallback(async (filterId: FilterId) => {
    if (!hasLutFilter(filterId)) return null
    if (lutCacheRef.current[filterId]) return lutCacheRef.current[filterId]

    const f = FILTERS.find((x) => x.id === filterId)
    if (!f?.cubeUrl) throw new Error(`Unknown filter: ${filterId}`)

    const res = await fetch(f.cubeUrl)
    if (!res.ok) throw new Error(`Failed to load LUT: ${res.status} ${res.statusText}`)
    const text = await res.text()
    const lut = parseCube(text)

    lutCacheRef.current[filterId] = lut
    return lut
  }, [])

  const runFullPipeline = useCallback(async () => {
    const img = imgRef.current
    const canvas = canvasRef.current
    if (!isImageReady(img) || !canvas) return

    const generation = ++pipelineGenRef.current
    setIsProcessing(true)
    pipelineReadyRef.current = false

    try {
      try {
        await img.decode()
      } catch {
        // decode() may fail on older browsers; fall back to load state checks
      }
      if (!isImageReady(img) || generation !== pipelineGenRef.current) return

      ensureGpu()
      const gpu = gpuRef.current
      const lut = hasLutFilter(filter) ? await loadLUT(filter) : null
      if (generation !== pipelineGenRef.current) return
      lutRef.current = lut

      const quality = getQuality()
      let rendered = false

      if (gpu && useGpuRef.current) {
        try {
          gpu.uploadSource(img)
          gpu.setLut(lut)
          renderGpu(quality)
          rendered = true
        } catch (gpuError) {
          console.warn('GPU pipeline failed, falling back to CPU', gpuError)
          gpu.destroy()
          gpuRef.current = null
          useGpuRef.current = false
          setGpuReady(false)
        }
      }

      if (!rendered) {
        if (!cpuCanvasRef.current) {
          cpuCanvasRef.current = document.createElement('canvas')
        }
        const cpuCanvas = cpuCanvasRef.current
        const ctx = cpuCanvas.getContext('2d', { willReadFrequently: true })
        if (!ctx) throw new Error('Cannot get 2D context')

        const w = img.naturalWidth
        const h = img.naturalHeight
        if (!w || !h) return

        cpuCanvas.width = w
        cpuCanvas.height = h
        ctx.drawImage(img, 0, 0, w, h)
        sourceDataRef.current = ctx.getImageData(0, 0, w, h)

        if (generation !== pipelineGenRef.current) return
        renderCpu(quality)
      }

      if (generation !== pipelineGenRef.current) return

      pipelineReadyRef.current = true
      setError(null)
    } catch (e) {
      if (generation === pipelineGenRef.current) {
        setError(e instanceof Error ? e.message : String(e))
      }
    } finally {
      if (generation === pipelineGenRef.current) {
        setIsProcessing(false)
      }
    }
  }, [ensureGpu, filter, loadLUT, renderCpu, renderGpu])

  const onImageLoad = useCallback(() => {
    if (!isImageReady(imgRef.current)) return
    runFullPipeline()
  }, [runFullPipeline])

  useEffect(() => {
    pipelineReadyRef.current = false
    sourceDataRef.current = null
    lutRef.current = null

    if (!imageUrl) return
    const img = imgRef.current
    if (!isImageReady(img)) return
    runFullPipeline()
  }, [imageUrl, runFullPipeline])

  // Filter change: reload the LUT (async) then re-render, without re-uploading source.
  useEffect(() => {
    if (!pipelineReadyRef.current) return
    if (!isImageReady(imgRef.current)) return

    let cancelled = false
    ;(async () => {
      try {
        const lut = hasLutFilter(filter) ? await loadLUT(filter) : null
        if (cancelled) return
        lutRef.current = lut
        gpuRef.current?.setLut(lut)
        render(getQuality())
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      }
    })()

    return () => {
      cancelled = true
    }
  }, [filter, loadLUT, render])

  useEffect(() => {
    if (!pipelineReadyRef.current) return
    if (!isImageReady(imgRef.current)) return
    render(getQuality())
  }, [strength, adjustments, pipelineOrder, render])

  const setAdjusting = useCallback(
    (adjusting: boolean) => {
      isAdjustingRef.current = adjusting
      if (!adjusting) {
        render('full')
        updateHistogram(true)
      }
    },
    [render, updateHistogram],
  )

  const exportImage = useCallback(async () => {
    const params: RenderParams = {
      adj: adjustmentsRef.current,
      hasLut: lutRef.current !== null,
      strength: strengthRef.current,
      colorFirst: colorFirstRef.current,
    }

    if (gpuRef.current && useGpuRef.current) {
      const exportCanvas = await gpuRef.current.exportFullResolution(params)
      updateHistogram(true)

      await new Promise<void>((resolve, reject) => {
        exportCanvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error('Export failed: could not generate image'))
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `fujifilm-${filter}.png`
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
      return
    }

    const source = sourceDataRef.current
    if (!source) return
    const exportCanvas = cpuCanvasRef.current ?? canvasRef.current
    if (!exportCanvas) return

    const fullOutput = runCpuChain(source)
    const ctx = exportCanvas.getContext('2d')
    if (!ctx) return

    exportCanvas.width = fullOutput.width
    exportCanvas.height = fullOutput.height
    ctx.putImageData(fullOutput, 0, 0)

    await new Promise<void>((resolve, reject) => {
      exportCanvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error('Export failed: could not generate image'))
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `fujifilm-${filter}.png`
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
  }, [filter, runCpuChain, updateHistogram])

  return {
    error,
    isProcessing,
    imageUrl,
    histogramBins,
    gpuReady,
    useGpu: gpuReady,
    imgRef,
    canvasRef,
    onImageLoad,
    exportImage,
    setAdjusting,
    setError,
  }
}

function downscaleImageData(imageData: ImageData, maxLongEdge = 1920): ImageData {
  const { width, height } = imageData
  const longEdge = Math.max(width, height)
  if (longEdge <= maxLongEdge) return imageData

  const scale = maxLongEdge / longEdge
  const targetW = Math.max(1, Math.round(width * scale))
  const targetH = Math.max(1, Math.round(height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = targetW
  canvas.height = targetH
  const ctx = canvas.getContext('2d')
  if (!ctx) return imageData

  const temp = document.createElement('canvas')
  temp.width = width
  temp.height = height
  temp.getContext('2d')?.putImageData(imageData, 0, 0)

  ctx.drawImage(temp, 0, 0, targetW, targetH)
  return ctx.getImageData(0, 0, targetW, targetH)
}
