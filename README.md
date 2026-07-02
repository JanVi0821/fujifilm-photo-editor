# Fujifilm Photo Editor

A browser-based photo editor that recreates the look of Fujifilm film simulations and lets you fine-tune color and tone in real time — all on the GPU, entirely client-side.

**Live site: [fuji-filter.jan0821.com](https://fuji-filter.jan0821.com)**

Your photos never leave your device: decoding, filtering, and adjustments all run locally in the browser via WebGL.

## Features

### Film simulations

Eleven Fujifilm-style looks driven by 3D LUTs (`.cube`), plus an "off" option:

Provia · Velvia · Classic Chrome · Classic Neg · Nostalgic Neg · Astia · Eterna · Bleach Bypass · Pro Neg Std · Pro Neg Hi · Reala Ace

- **Strength blend** — dial any simulation from 0–100% to taste.

### Color & tone adjustments

- **Basic** — Exposure, Contrast, Saturation, Temperature, Tint
- **Lighting** — Highlights, Shadows, Whites, Blacks
- **HSL / Color** — pick colors directly from the image with the eyedropper and adjust each target's Hue, Saturation, and Luminance independently. Add multiple color targets, tune each one's hue range, and remove them at will.

### Customizable pipeline order

Choose whether the **Film Simulation** stage or the **Color & Tone** stage is applied first, and reorder the two at any time. The same filter and settings can produce distinctly different results depending on the order.

### More

- **Live histogram** of the processed result
- **Before / after** compare (press and hold)
- **Upload your own image** or start from the built-in sample
- **Full-resolution PNG export**

## Performance

The rendering pipeline is built for responsiveness on large images:

- **GPU-accelerated** color grading and LUT sampling via [`regl`](https://github.com/regl-project/regl) (WebGL), running on offscreen framebuffers.
- **Interactive preview** renders a downscaled version while you drag sliders, then re-renders at **full resolution** on release and for export.
- **Automatic CPU fallback** if WebGL is unavailable, so the editor still works everywhere.

The pipeline is order-aware and unified across both stages:

```
Filter first:  source → Film Simulation → Color & Tone → display
Color first:   source → Color & Tone → Film Simulation → display
```

## Tech stack

- **React 19** + **TypeScript**
- **Vite 7** for dev/build tooling
- **regl** for the WebGL rendering pipeline

## Getting started

```bash
# install dependencies
npm install

# start the dev server (http://localhost:5173)
npm run dev

# type-check and build for production
npm run build

# preview the production build
npm run preview
```

## Project structure

```
src/
  components/        UI: sidebar, editing panel, preview, histogram, sliders
  constants/         Adjustment ranges, filters, HSL model, pipeline order
  gpu/               WebGL renderer, shaders, LUT atlas, downscaling
  hooks/             useImageProcessing — the render orchestration
  image/             CPU fallback: adjustments, HSL, color, histogram
  lut/               .cube LUT parsing and sampling
public/
  luts/              Fujifilm-style .cube LUT files
  sample.jpg         Built-in sample image
```

## License

Personal project. LUTs are used for demonstration purposes.
