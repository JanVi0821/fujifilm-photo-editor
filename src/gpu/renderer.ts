import createREGL, { type Framebuffer2D, type Regl, type Texture2D } from 'regl'

import { MAX_HSL_TARGETS, packHslTargetsForGpu } from '../constants/hsl'
import type { ImageAdjustments } from '../constants/adjustments'
import type { CubeLUT } from '../lut/cube'
import { getPreviewSize } from './downscale'
import { cubeToLutAtlas } from './lutAtlas'
import {
  ADJUSTMENTS_FRAG,
  BLEND_FRAG,
  DOWNSCALE_FRAG,
  LUT_FRAG,
  VERTEX_SHADER,
} from './shaders'

export type RenderQuality = 'preview' | 'full'

const QUAD = [-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]

type GpuBuffers = {
  source: Framebuffer2D
  previewSource: Framebuffer2D
  fullLut: Framebuffer2D
  fullA: Framebuffer2D
  fullB: Framebuffer2D
  prevLut: Framebuffer2D
  prevA: Framebuffer2D
  prevB: Framebuffer2D
}

export type RenderParams = {
  adj: ImageAdjustments
  hasLut: boolean
  strength: number
  colorFirst: boolean
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DrawPass = (...args: any[]) => void

export class GpuRenderer {
  private regl: Regl
  private glCanvas: HTMLCanvasElement
  private displayCanvas: HTMLCanvasElement
  private displayCtx: CanvasRenderingContext2D
  private buffers: GpuBuffers
  private lutAtlas: Texture2D | null = null
  private sourceTexture: Texture2D | null = null
  private lutSize = 0
  private fullWidth = 0
  private fullHeight = 0
  private previewWidth = 0
  private previewHeight = 0
  private histogramSource: Framebuffer2D | null = null

  private drawLut: DrawPass
  private drawBlend: DrawPass
  private drawAdjust: DrawPass
  private drawDownscale: DrawPass
  private drawPassthrough: DrawPass

  constructor(displayCanvas: HTMLCanvasElement) {
    this.displayCanvas = displayCanvas
    this.glCanvas = document.createElement('canvas')

    const ctx = displayCanvas.getContext('2d')
    if (!ctx) throw new Error('Cannot get 2D context for display canvas')
    this.displayCtx = ctx

    this.regl = createREGL({
      canvas: this.glCanvas,
      pixelRatio: 1,
      attributes: {
        preserveDrawingBuffer: true,
        antialias: false,
        alpha: false,
      },
    })

    this.buffers = this.createBuffers(1, 1)
    this.drawLut = this.createDrawPass(LUT_FRAG)
    this.drawBlend = this.createDrawPass(BLEND_FRAG)
    this.drawAdjust = this.createDrawPass(ADJUSTMENTS_FRAG)
    this.drawDownscale = this.createDrawPass(DOWNSCALE_FRAG)
    this.drawPassthrough = this.createDrawPass(DOWNSCALE_FRAG)
  }

  private createBuffers(width: number, height: number): GpuBuffers {
    const preview = getPreviewSize(width, height)
    this.fullWidth = width
    this.fullHeight = height
    this.previewWidth = preview.width
    this.previewHeight = preview.height

    const makeFbo = (w: number, h: number) =>
      this.regl.framebuffer({
        width: w,
        height: h,
        colorType: 'uint8',
        depth: false,
        stencil: false,
      })

    return {
      source: makeFbo(width, height),
      previewSource: makeFbo(preview.width, preview.height),
      fullLut: makeFbo(width, height),
      fullA: makeFbo(width, height),
      fullB: makeFbo(width, height),
      prevLut: makeFbo(preview.width, preview.height),
      prevA: makeFbo(preview.width, preview.height),
      prevB: makeFbo(preview.width, preview.height),
    }
  }

  private createDrawPass(frag: string): DrawPass {
    // regl reflects array uniforms as individual elements (e.g. uHslCenterHue[0]),
    // so each element must be declared and supplied separately.
    const uniforms: Record<string, unknown> = {
      uTexture: this.regl.prop<TextureProps, 'texture'>('texture'),
      uSource: this.regl.prop<LutProps, 'source'>('source'),
      uLutAtlas: this.regl.prop<LutProps, 'lutAtlas'>('lutAtlas'),
      uLutSize: this.regl.prop<LutProps, 'lutSize'>('lutSize'),
      uHasLut: this.regl.prop<LutProps, 'hasLut'>('hasLut'),
      uFiltered: this.regl.prop<BlendProps, 'filtered'>('filtered'),
      uStrength: this.regl.prop<BlendProps, 'strength'>('strength'),
      uExposure: this.regl.prop<AdjustProps, 'uExposure'>('uExposure'),
      uContrast: this.regl.prop<AdjustProps, 'uContrast'>('uContrast'),
      uSaturation: this.regl.prop<AdjustProps, 'uSaturation'>('uSaturation'),
      uTemperature: this.regl.prop<AdjustProps, 'uTemperature'>('uTemperature'),
      uTint: this.regl.prop<AdjustProps, 'uTint'>('uTint'),
      uHighlights: this.regl.prop<AdjustProps, 'uHighlights'>('uHighlights'),
      uShadows: this.regl.prop<AdjustProps, 'uShadows'>('uShadows'),
      uWhites: this.regl.prop<AdjustProps, 'uWhites'>('uWhites'),
      uBlacks: this.regl.prop<AdjustProps, 'uBlacks'>('uBlacks'),
      uHslTargetCount: this.regl.prop<AdjustProps, 'uHslTargetCount'>('uHslTargetCount'),
    }

    // regl reflects `uniform float uHslCenterHue[8]` as individual active uniforms
    // ("uHslCenterHue[0]"...). The uniform key must match that GLSL name, but the
    // prop accessor uses a bracket-free flat name to avoid regl's array-path parsing.
    for (let i = 0; i < MAX_HSL_TARGETS; i += 1) {
      uniforms[`uHslCenterHue[${i}]`] = this.regl.prop(`hslCenterHue${i}` as never)
      uniforms[`uHslHueRange[${i}]`] = this.regl.prop(`hslHueRange${i}` as never)
      uniforms[`uHslAdjust[${i}]`] = this.regl.prop(`hslAdjust${i}` as never)
    }

    return this.regl({
      vert: VERTEX_SHADER,
      frag,
      attributes: {
        position: QUAD,
      },
      uniforms,
      count: 6,
    })
  }

  resize(width: number, height: number) {
    if (width === this.fullWidth && height === this.fullHeight) return

    this.destroyBuffers()
    this.buffers = this.createBuffers(width, height)
    this.histogramSource = null
  }

  private destroyBuffers() {
    this.buffers.source.destroy()
    this.buffers.previewSource.destroy()
    this.buffers.fullLut.destroy()
    this.buffers.fullA.destroy()
    this.buffers.fullB.destroy()
    this.buffers.prevLut.destroy()
    this.buffers.prevA.destroy()
    this.buffers.prevB.destroy()
  }

  uploadSource(image: HTMLImageElement) {
    const width = image.naturalWidth
    const height = image.naturalHeight
    if (!image.complete || width <= 0 || height <= 0) {
      throw new Error('Image not ready for GPU upload')
    }

    this.resize(width, height)

    this.sourceTexture?.destroy()
    this.sourceTexture = this.regl.texture({
      data: image,
      flipY: true,
    })

    this.regl({
      framebuffer: this.buffers.source,
      viewport: { x: 0, y: 0, width, height },
    })(() => {
      this.drawPassthrough({ texture: this.sourceTexture! })
    })

    this.regl({
      framebuffer: this.buffers.previewSource,
      viewport: { x: 0, y: 0, width: this.previewWidth, height: this.previewHeight },
    })(() => {
      this.drawDownscale({ texture: this.buffers.source })
    })
  }

  setLut(lut: CubeLUT | null) {
    if (!lut) {
      this.lutAtlas?.destroy()
      this.lutAtlas = null
      this.lutSize = 0
      return
    }

    const atlas = cubeToLutAtlas(lut)
    this.lutAtlas?.destroy()
    this.lutAtlas = this.regl.texture({
      width: atlas.width,
      height: atlas.height,
      data: atlas.data,
      format: 'rgba',
      min: 'linear',
      mag: 'linear',
      wrap: 'clamp',
    })
    this.lutSize = atlas.size
  }

  // Filter stage: filtered = mix(input, LUT(input), strength).
  private filterInto(
    input: Framebuffer2D,
    lutTmp: Framebuffer2D,
    out: Framebuffer2D,
    width: number,
    height: number,
    hasLut: boolean,
    strength: number,
  ) {
    this.regl({
      framebuffer: lutTmp,
      viewport: { x: 0, y: 0, width, height },
    })(() => {
      this.drawLut({
        source: input,
        lutAtlas: this.lutAtlas ?? input,
        lutSize: this.lutSize,
        hasLut: hasLut ? 1 : 0,
      })
    })

    this.regl({
      framebuffer: out,
      viewport: { x: 0, y: 0, width, height },
    })(() => {
      this.drawBlend({
        source: input,
        filtered: lutTmp,
        strength,
      })
    })
  }

  private adjustmentProps(adj: ImageAdjustments, filmBuffer: Framebuffer2D): AdjustProps {
    const packed = packHslTargetsForGpu(adj.hsl.targets)

    const props: Record<string, unknown> = {
      texture: filmBuffer,
      uExposure: adj.exposure,
      uContrast: adj.contrast,
      uSaturation: adj.saturation,
      uTemperature: adj.temperature,
      uTint: adj.tint,
      uHighlights: adj.highlights,
      uShadows: adj.shadows,
      uWhites: adj.whites,
      uBlacks: adj.blacks,
      uHslTargetCount: packed.count,
    }

    for (let i = 0; i < MAX_HSL_TARGETS; i += 1) {
      props[`hslCenterHue${i}`] = packed.centerHue[i]
      props[`hslHueRange${i}`] = packed.hueRange[i]
      props[`hslAdjust${i}`] = packed.adjust[i]
    }

    return props as AdjustProps
  }

  private renderAdjustmentsToFbo(
    adj: ImageAdjustments,
    filmBuffer: Framebuffer2D,
    output: Framebuffer2D,
    width: number,
    height: number,
  ) {
    if (width <= 0 || height <= 0) return

    this.regl({
      framebuffer: output,
      viewport: { x: 0, y: 0, width, height },
    })(() => {
      this.drawAdjust(this.adjustmentProps(adj, filmBuffer))
    })
  }

  private readFboPixels(fbo: Framebuffer2D, width: number, height: number): ImageData {
    const data = this.regl.read({
      framebuffer: fbo,
      x: 0,
      y: 0,
      width,
      height,
    }) as Uint8Array

    const pixels = new Uint8ClampedArray(width * height * 4)
    const rowBytes = width * 4
    for (let y = 0; y < height; y += 1) {
      const srcRow = (height - 1 - y) * rowBytes
      const dstRow = y * rowBytes
      for (let i = 0; i < rowBytes; i += 4) {
        pixels[dstRow + i] = data[srcRow + i]!
        pixels[dstRow + i + 1] = data[srcRow + i + 1]!
        pixels[dstRow + i + 2] = data[srcRow + i + 2]!
        pixels[dstRow + i + 3] = 255
      }
    }

    return new ImageData(pixels, width, height)
  }

  private presentFromFbo(fbo: Framebuffer2D, width: number, height: number) {
    if (width <= 0 || height <= 0) return

    const imageData = this.readFboPixels(fbo, width, height)

    if (this.displayCanvas.width !== width) this.displayCanvas.width = width
    if (this.displayCanvas.height !== height) this.displayCanvas.height = height
    this.displayCtx.putImageData(imageData, 0, 0)
  }

  // Runs the full stage chain at a single resolution and returns the final fbo.
  private renderChainInto(
    params: RenderParams,
    srcBuffer: Framebuffer2D,
    lutTmp: Framebuffer2D,
    bufA: Framebuffer2D,
    bufB: Framebuffer2D,
    width: number,
    height: number,
  ): Framebuffer2D {
    if (params.colorFirst) {
      this.renderAdjustmentsToFbo(params.adj, srcBuffer, bufA, width, height)
      this.filterInto(bufA, lutTmp, bufB, width, height, params.hasLut, params.strength)
      return bufB
    }

    this.filterInto(srcBuffer, lutTmp, bufA, width, height, params.hasLut, params.strength)
    this.renderAdjustmentsToFbo(params.adj, bufA, bufB, width, height)
    return bufB
  }

  renderImage(params: RenderParams, quality: RenderQuality) {
    if (this.fullWidth <= 0 || this.fullHeight <= 0) return

    if (quality === 'preview') {
      const final = this.renderChainInto(
        params,
        this.buffers.previewSource,
        this.buffers.prevLut,
        this.buffers.prevA,
        this.buffers.prevB,
        this.previewWidth,
        this.previewHeight,
      )
      this.histogramSource = final
      this.presentFromFbo(final, this.previewWidth, this.previewHeight)
      return
    }

    const final = this.renderChainInto(
      params,
      this.buffers.source,
      this.buffers.fullLut,
      this.buffers.fullA,
      this.buffers.fullB,
      this.fullWidth,
      this.fullHeight,
    )

    this.regl({
      framebuffer: this.buffers.prevB,
      viewport: { x: 0, y: 0, width: this.previewWidth, height: this.previewHeight },
    })(() => {
      this.drawDownscale({ texture: final })
    })

    this.histogramSource = this.buffers.prevB
    this.presentFromFbo(this.buffers.prevB, this.previewWidth, this.previewHeight)
  }

  readScreenPixels(): { data: Uint8Array; width: number; height: number } | null {
    const source = this.histogramSource ?? this.buffers.prevB
    const width = this.previewWidth
    const height = this.previewHeight
    if (width <= 0 || height <= 0) return null

    try {
      const data = this.regl.read({
        framebuffer: source,
        x: 0,
        y: 0,
        width,
        height,
      }) as Uint8Array
      return { data, width, height }
    } catch {
      return null
    }
  }

  getDimensions(quality: RenderQuality) {
    return quality === 'preview'
      ? { width: this.previewWidth, height: this.previewHeight }
      : { width: this.fullWidth, height: this.fullHeight }
  }

  async exportFullResolution(params: RenderParams): Promise<HTMLCanvasElement> {
    const final = this.renderChainInto(
      params,
      this.buffers.source,
      this.buffers.fullLut,
      this.buffers.fullA,
      this.buffers.fullB,
      this.fullWidth,
      this.fullHeight,
    )

    const imageData = this.readFboPixels(final, this.fullWidth, this.fullHeight)

    const canvas = document.createElement('canvas')
    canvas.width = this.fullWidth
    canvas.height = this.fullHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Cannot create export canvas')

    ctx.putImageData(imageData, 0, 0)
    return canvas
  }

  destroy() {
    this.sourceTexture?.destroy()
    this.lutAtlas?.destroy()
    this.destroyBuffers()
    this.regl.destroy()
  }
}

type LutProps = {
  source: Framebuffer2D
  lutAtlas: Texture2D | Framebuffer2D
  lutSize: number
  hasLut: number
}

type BlendProps = {
  source: Framebuffer2D
  filtered: Framebuffer2D
  strength: number
}

type TextureProps = {
  texture: Texture2D | Framebuffer2D
}

type AdjustProps = TextureProps & {
  uExposure: number
  uContrast: number
  uSaturation: number
  uTemperature: number
  uTint: number
  uHighlights: number
  uShadows: number
  uWhites: number
  uBlacks: number
  uHslTargetCount: number
  [key: `hslCenterHue${number}`]: number
  [key: `hslHueRange${number}`]: number
  [key: `hslAdjust${number}`]: [number, number, number]
}
