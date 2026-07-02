import { useCallback, useEffect, useRef, useState } from 'react'

import type { ImageAdjustments } from '../constants/adjustments'
import { FILTERS, hasLutFilter, type FilterId } from '../constants/filters'
import { GpuRenderer, type RenderQuality } from '../gpu/renderer'
import {
  applyImageAdjustments,
  blendPixels,
  copyImageData,
} from '../image/adjustments'
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

export function useImageProcessing(
  imageSource: ImageSource,
  filter: FilterId,
  strength: number,
  adjustments: ImageAdjustments,
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
  const lutDataRef = useRef<ImageData | null>(null)
  const filmBlendedRef = useRef<ImageData | null>(null)
  const strengthRef = useRef(strength)
  const adjustmentsRef = useRef(adjustments)
  const isAdjustingRef = useRef(false)
  const lastHistogramAtRef = useRef(0)
  const pipelineGenRef = useRef(0)

  strengthRef.current = strength
  adjustmentsRef.current = adjustments

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

  const updateHistogram = useCallback((force = false) => {
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

    const filmBlended = filmBlendedRef.current
    if (!filmBlended) return

    const output = applyImageAdjustments(filmBlended, adjustmentsRef.current)
    setHistogramBins(computeLuminanceHistogram(output))
  }, [])

  const renderCpuAdjustments = useCallback((adj: ImageAdjustments, quality: RenderQuality) => {
    const filmBlended = filmBlendedRef.current
    const canvas = canvasRef.current
    if (!filmBlended || !canvas) return

    const workInput = quality === 'preview' ? downscaleImageData(filmBlended) : filmBlended
    const output = applyImageAdjustments(workInput, adj)
    const display = quality === 'full' ? downscaleImageData(output) : output

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = display.width
    canvas.height = display.height
    ctx.putImageData(display, 0, 0)
    updateHistogram(false)
  }, [updateHistogram])

  const renderGpuAdjustments = useCallback((adj: ImageAdjustments, quality: RenderQuality) => {
    const gpu = gpuRef.current
    if (!gpu) throw new Error('GPU renderer not ready')

    gpu.renderAdjustments(adj, quality)
    updateHistogram(false)
  }, [updateHistogram])

  const renderAdjustments = useCallback((adj: ImageAdjustments, quality: RenderQuality) => {
    if (gpuRef.current && useGpuRef.current) {
      renderGpuAdjustments(adj, quality)
    } else {
      renderCpuAdjustments(adj, quality)
    }
  }, [renderCpuAdjustments, renderGpuAdjustments])

  const loadLUT = useCallback(async (filterId: FilterId) => {
    if (!hasLutFilter(filterId)) return null
    if (lutCacheRef.current[filterId]) return lutCacheRef.current[filterId]

    const f = FILTERS.find((x) => x.id === filterId)
    if (!f?.cubeUrl) throw new Error(`Unknown filter: ${filterId}`)

    const res = await fetch(f.cubeUrl)
    if (!res.ok) throw new Error(`LUT 加载失败: ${res.status} ${res.statusText}`)
    const text = await res.text()
    const lut = parseCube(text)

    lutCacheRef.current[filterId] = lut
    return lut
  }, [])

  const applyLutToSourceCpu = useCallback(async (filterId: FilterId) => {
    const source = sourceDataRef.current
    if (!source) return

    const lutData = copyImageData(source)

    if (hasLutFilter(filterId)) {
      const d = lutData.data
      const lut = await loadLUT(filterId)
      if (!lut) return

      for (let i = 0; i < d.length; i += 4) {
        const r = d[i] / 255
        const g = d[i + 1] / 255
        const b = d[i + 2] / 255
        const [nr, ng, nb] = sampleLUT(lut, r, g, b)
        d[i] = Math.round(nr * 255)
        d[i + 1] = Math.round(ng * 255)
        d[i + 2] = Math.round(nb * 255)
      }
    }

    lutDataRef.current = lutData
  }, [loadLUT])

  const renderFilmPipelineCpu = useCallback(async (filterId: FilterId, s: number) => {
    await applyLutToSourceCpu(filterId)
    const source = sourceDataRef.current
    const lutData = lutDataRef.current
    if (!source || !lutData) return
    filmBlendedRef.current = blendPixels(source, lutData, s)
  }, [applyLutToSourceCpu])

  const renderFilmPipelineGpu = useCallback((filterId: FilterId, s: number, lut: CubeLUT | null) => {
    const gpu = gpuRef.current
    if (!gpu) return

    gpu.setLut(lut)
    gpu.renderFilmPass(hasLutFilter(filterId) && lut !== null)
    gpu.renderBlendPass(s)
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

      const quality = getQuality()

      let rendered = false

      if (gpu && useGpuRef.current) {
        try {
          gpu.uploadSource(img)
          renderFilmPipelineGpu(filter, strengthRef.current, lut)
          renderGpuAdjustments(adjustmentsRef.current, quality)
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

        await renderFilmPipelineCpu(filter, strengthRef.current)
        if (generation !== pipelineGenRef.current) return
        renderCpuAdjustments(adjustmentsRef.current, quality)
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
  }, [
    ensureGpu,
    filter,
    loadLUT,
    renderCpuAdjustments,
    renderFilmPipelineCpu,
    renderFilmPipelineGpu,
    renderGpuAdjustments,
  ])

  const onImageLoad = useCallback(() => {
    if (!isImageReady(imgRef.current)) return
    runFullPipeline()
  }, [runFullPipeline])

  useEffect(() => {
    pipelineReadyRef.current = false
    filmBlendedRef.current = null
    sourceDataRef.current = null
    lutDataRef.current = null

    if (!imageUrl) return
    const img = imgRef.current
    if (!isImageReady(img)) return
    runFullPipeline()
  }, [imageUrl, runFullPipeline])

  useEffect(() => {
    if (!isImageReady(imgRef.current)) return
    runFullPipeline()
  }, [filter, runFullPipeline])

  useEffect(() => {
    if (!pipelineReadyRef.current) return
    if (!gpuRef.current && !filmBlendedRef.current) return
    if (!isImageReady(imgRef.current)) return

    if (gpuRef.current && useGpuRef.current) {
      gpuRef.current.renderBlendPass(strength)
      renderAdjustments(adjustmentsRef.current, getQuality())
      return
    }

    if (!lutDataRef.current || !sourceDataRef.current) return
    filmBlendedRef.current = blendPixels(sourceDataRef.current, lutDataRef.current, strength)
    renderAdjustments(adjustmentsRef.current, getQuality())
  }, [strength, renderAdjustments])

  useEffect(() => {
    if (!pipelineReadyRef.current) return
    if (!gpuRef.current && !filmBlendedRef.current) return
    if (!isImageReady(imgRef.current)) return

    renderAdjustments(adjustments, getQuality())
  }, [adjustments, renderAdjustments])

  const setAdjusting = useCallback(
    (adjusting: boolean) => {
      isAdjustingRef.current = adjusting
      if (!adjusting) {
        renderAdjustments(adjustmentsRef.current, 'full')
        updateHistogram(true)
      }
    },
    [renderAdjustments, updateHistogram],
  )

  const exportImage = useCallback(async () => {
    if (gpuRef.current && useGpuRef.current) {
      const exportCanvas = await gpuRef.current.exportFullResolution(adjustmentsRef.current)
      updateHistogram(true)

      await new Promise<void>((resolve, reject) => {
        exportCanvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error('导出失败：无法生成图片'))
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

    const exportCanvas = cpuCanvasRef.current ?? canvasRef.current
    if (!exportCanvas) return

    const filmBlended = filmBlendedRef.current
    if (!filmBlended) return

    const fullOutput = applyImageAdjustments(filmBlended, adjustmentsRef.current)
    const ctx = exportCanvas.getContext('2d')
    if (!ctx) return

    exportCanvas.width = fullOutput.width
    exportCanvas.height = fullOutput.height
    ctx.putImageData(fullOutput, 0, 0)

    await new Promise<void>((resolve, reject) => {
      exportCanvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error('导出失败：无法生成图片'))
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
  }, [filter, updateHistogram])

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
