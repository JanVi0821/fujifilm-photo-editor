export const VERTEX_SHADER = `
attribute vec2 position;
varying vec2 vUv;

void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
`

export const PASSTHROUGH_FRAG = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uTexture;

void main() {
  gl_FragColor = texture2D(uTexture, vUv);
}
`

export const DOWNSCALE_FRAG = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uTexture;

void main() {
  gl_FragColor = texture2D(uTexture, vUv);
}
`

export const LUT_FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uSource;
uniform sampler2D uLutAtlas;
uniform float uLutSize;
uniform float uHasLut;

vec3 sampleLut(vec3 color) {
  float size = uLutSize;
  float slice = color.b * (size - 1.0);
  float sliceFloor = floor(slice);
  float sliceCeil = min(sliceFloor + 1.0, size - 1.0);
  float sliceFrac = slice - sliceFloor;

  vec2 quad1 = vec2(
    (sliceFloor * size + color.r * (size - 1.0) + 0.5) / (size * size),
    (color.g * (size - 1.0) + 0.5) / size
  );
  vec2 quad2 = vec2(
    (sliceCeil * size + color.r * (size - 1.0) + 0.5) / (size * size),
    (color.g * (size - 1.0) + 0.5) / size
  );

  vec3 c1 = texture2D(uLutAtlas, quad1).rgb;
  vec3 c2 = texture2D(uLutAtlas, quad2).rgb;
  return mix(c1, c2, sliceFrac);
}

void main() {
  vec4 src = texture2D(uSource, vUv);
  if (uHasLut < 0.5) {
    gl_FragColor = src;
    return;
  }
  gl_FragColor = vec4(sampleLut(src.rgb), src.a);
}
`

export const BLEND_FRAG = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uSource;
uniform sampler2D uFiltered;
uniform float uStrength;

void main() {
  vec4 a = texture2D(uSource, vUv);
  vec4 b = texture2D(uFiltered, vUv);
  float t = uStrength / 100.0;
  gl_FragColor = mix(a, b, t);
}
`

// Fused filter stage: LUT sampling and strength blend in a single pass,
// so the pipeline needs one fewer full-resolution framebuffer.
export const FILTER_FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uSource;
uniform sampler2D uLutAtlas;
uniform float uLutSize;
uniform float uHasLut;
uniform float uStrength;

vec3 sampleLut(vec3 color) {
  float size = uLutSize;
  float slice = color.b * (size - 1.0);
  float sliceFloor = floor(slice);
  float sliceCeil = min(sliceFloor + 1.0, size - 1.0);
  float sliceFrac = slice - sliceFloor;

  vec2 quad1 = vec2(
    (sliceFloor * size + color.r * (size - 1.0) + 0.5) / (size * size),
    (color.g * (size - 1.0) + 0.5) / size
  );
  vec2 quad2 = vec2(
    (sliceCeil * size + color.r * (size - 1.0) + 0.5) / (size * size),
    (color.g * (size - 1.0) + 0.5) / size
  );

  vec3 c1 = texture2D(uLutAtlas, quad1).rgb;
  vec3 c2 = texture2D(uLutAtlas, quad2).rgb;
  return mix(c1, c2, sliceFrac);
}

void main() {
  vec4 src = texture2D(uSource, vUv);
  vec3 filtered = src.rgb;
  if (uHasLut > 0.5) {
    filtered = sampleLut(src.rgb);
  }
  float t = uStrength / 100.0;
  gl_FragColor = vec4(mix(src.rgb, filtered, t), src.a);
}
`

// Extract highlights above a luminance threshold (for the halation bloom).
export const HALATION_EXTRACT_FRAG = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uSource;
uniform float uThreshold;

void main() {
  vec3 c = texture2D(uSource, vUv).rgb;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float m = smoothstep(uThreshold, min(uThreshold + 0.2, 1.0), l);
  gl_FragColor = vec4(c * m, 1.0);
}
`

// Separable 9-tap Gaussian blur; uDir is the per-tap texel step (x or y).
export const BLUR_FRAG = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uDir;

void main() {
  vec3 sum = vec3(0.0);
  sum += texture2D(uTex, vUv + uDir * -4.0).rgb * 0.05;
  sum += texture2D(uTex, vUv + uDir * -3.0).rgb * 0.09;
  sum += texture2D(uTex, vUv + uDir * -2.0).rgb * 0.12;
  sum += texture2D(uTex, vUv + uDir * -1.0).rgb * 0.15;
  sum += texture2D(uTex, vUv).rgb * 0.18;
  sum += texture2D(uTex, vUv + uDir * 1.0).rgb * 0.15;
  sum += texture2D(uTex, vUv + uDir * 2.0).rgb * 0.12;
  sum += texture2D(uTex, vUv + uDir * 3.0).rgb * 0.09;
  sum += texture2D(uTex, vUv + uDir * 4.0).rgb * 0.05;
  gl_FragColor = vec4(sum, 1.0);
}
`

// Final "film finish" stage: warm halation bloom + procedural grain.
export const FINISH_FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTexture;
uniform sampler2D uHalo;
uniform vec2 uResolution;
uniform float uGrain;
uniform float uGrainSize;
uniform float uHalation;
uniform vec3 uHalationTint;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec3 c = texture2D(uTexture, vUv).rgb;

  if (uHalation > 0.0) {
    vec3 halo = texture2D(uHalo, vUv).rgb;
    float h = max(max(halo.r, halo.g), halo.b);
    vec3 glow = uHalationTint * h * uHalation * 1.3;
    // Screen blend so the bloom lifts highlights without hard clipping.
    c = 1.0 - (1.0 - c) * (1.0 - clamp(glow, 0.0, 1.0));
  }

  if (uGrain > 0.0) {
    vec2 gcoord = floor(vUv * uResolution / max(uGrainSize, 1.0));
    float n = hash(gcoord) - 0.5;
    float l = dot(c, vec3(0.299, 0.587, 0.114));
    // Grain is most visible in the midtones, subtler in deep shadows / highlights.
    float lumaMod = 1.0 - abs(l - 0.5) * 0.9;
    c += n * uGrain * 0.14 * (0.35 + 0.65 * lumaMod);
  }

  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}
`

export const ADJUSTMENTS_FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTexture;

uniform float uExposure;
uniform float uContrast;
uniform float uSaturation;
uniform float uTemperature;
uniform float uTint;
uniform float uHighlights;
uniform float uShadows;
uniform float uWhites;
uniform float uBlacks;

uniform float uHslTargetCount;
uniform float uHslCenterHue[8];
uniform float uHslHueRange[8];
uniform vec3 uHslAdjust[8];

const float NEUTRAL_TEMP = 5500.0;

float clamp01(float x) {
  return clamp(x, 0.0, 1.0);
}

float luma(vec3 c) {
  return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

float smoothstepRange(float edge0, float edge1, float x) {
  float t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3.0 - 2.0 * t);
}

vec3 applyExposure(vec3 c, float ev) {
  return c * pow(2.0, ev);
}

vec3 applyContrast(vec3 c, float contrast) {
  float factor = (100.0 + contrast) / 100.0;
  return (c - 0.5) * factor + 0.5;
}

vec3 applySaturation(vec3 c, float saturation) {
  float factor = (100.0 + saturation) / 100.0;
  float y = luma(c);
  return vec3(y) + (c - vec3(y)) * factor;
}

vec3 applyTemperatureTint(vec3 c, float kelvin, float tint) {
  float tempDelta = (kelvin - NEUTRAL_TEMP) / NEUTRAL_TEMP;
  float rMul = 1.0 + tempDelta * 0.35;
  float bMul = 1.0 - tempDelta * 0.35;
  float gMul = 1.0 - (tint / 100.0) * 0.25;
  return vec3(c.r * rMul, c.g * gMul, c.b * bMul);
}

vec3 applyLighting(vec3 c, float highlights, float shadows, float whites, float blacks) {
  float y = luma(c);
  float highlightMask = smoothstepRange(0.45, 0.95, y);
  float shadowMask = 1.0 - smoothstepRange(0.05, 0.55, y);
  float whiteMask = smoothstepRange(0.75, 1.0, y);
  float blackMask = 1.0 - smoothstepRange(0.0, 0.25, y);

  float shift =
    (highlights / 100.0) * 0.35 * highlightMask +
    (shadows / 100.0) * 0.35 * shadowMask +
    (whites / 100.0) * 0.25 * whiteMask +
    (blacks / 100.0) * 0.25 * blackMask;

  return clamp(c + shift, 0.0, 1.0);
}

vec3 rgbToHsl(vec3 c) {
  float maxc = max(max(c.r, c.g), c.b);
  float minc = min(min(c.r, c.g), c.b);
  float l = (maxc + minc) * 0.5;
  float h = 0.0;
  float s = 0.0;

  if (maxc != minc) {
    float d = maxc - minc;
    s = l > 0.5 ? d / (2.0 - maxc - minc) : d / (maxc + minc);
    if (maxc == c.r) {
      h = (c.g - c.b) / d + (c.g < c.b ? 6.0 : 0.0);
    } else if (maxc == c.g) {
      h = (c.b - c.r) / d + 2.0;
    } else {
      h = (c.r - c.g) / d + 4.0;
    }
    h /= 6.0;
  }

  return vec3(h * 360.0, s, l);
}

float hueToRgb(float p, float q, float t) {
  float tt = t;
  if (tt < 0.0) tt += 1.0;
  if (tt > 1.0) tt -= 1.0;
  if (tt < 1.0 / 6.0) return p + (q - p) * 6.0 * tt;
  if (tt < 0.5) return q;
  if (tt < 2.0 / 3.0) return p + (q - p) * (2.0 / 3.0 - tt) * 6.0;
  return p;
}

vec3 hslToRgb(vec3 hsl) {
  float h = mod(hsl.x, 360.0) / 360.0;
  float s = hsl.y;
  float l = hsl.z;

  if (s == 0.0) return vec3(l);

  float q = l < 0.5 ? l * (1.0 + s) : l + s - l * s;
  float p = 2.0 * l - q;
  return vec3(
    hueToRgb(p, q, h + 1.0 / 3.0),
    hueToRgb(p, q, h),
    hueToRgb(p, q, h - 1.0 / 3.0)
  );
}

float colorWeightRange(float pixelHue, float centerHue, float halfWidth) {
  float dist = abs(pixelHue - centerHue);
  if (dist > 180.0) dist = 360.0 - dist;
  if (dist >= halfWidth) return 0.0;
  float t = 1.0 - dist / halfWidth;
  return t * t * (3.0 - 2.0 * t);
}

vec3 applyAllHsl(vec3 c) {
  vec3 hsl = rgbToHsl(c);

  if (uHslTargetCount < 0.5) return c;

  float hueShift = 0.0;
  float satAdj = 0.0;
  float lumAdj = 0.0;
  float wSum = 0.0;
  float w;

  if (uHslTargetCount > 0.5) {
    w = colorWeightRange(hsl.x, uHslCenterHue[0], uHslHueRange[0]);
    if (w > 0.0) {
      hueShift += w * uHslAdjust[0].x;
      satAdj += w * uHslAdjust[0].y;
      lumAdj += w * uHslAdjust[0].z;
      wSum += w;
    }
  }
  if (uHslTargetCount > 1.5) {
    w = colorWeightRange(hsl.x, uHslCenterHue[1], uHslHueRange[1]);
    if (w > 0.0) {
      hueShift += w * uHslAdjust[1].x;
      satAdj += w * uHslAdjust[1].y;
      lumAdj += w * uHslAdjust[1].z;
      wSum += w;
    }
  }
  if (uHslTargetCount > 2.5) {
    w = colorWeightRange(hsl.x, uHslCenterHue[2], uHslHueRange[2]);
    if (w > 0.0) {
      hueShift += w * uHslAdjust[2].x;
      satAdj += w * uHslAdjust[2].y;
      lumAdj += w * uHslAdjust[2].z;
      wSum += w;
    }
  }
  if (uHslTargetCount > 3.5) {
    w = colorWeightRange(hsl.x, uHslCenterHue[3], uHslHueRange[3]);
    if (w > 0.0) {
      hueShift += w * uHslAdjust[3].x;
      satAdj += w * uHslAdjust[3].y;
      lumAdj += w * uHslAdjust[3].z;
      wSum += w;
    }
  }
  if (uHslTargetCount > 4.5) {
    w = colorWeightRange(hsl.x, uHslCenterHue[4], uHslHueRange[4]);
    if (w > 0.0) {
      hueShift += w * uHslAdjust[4].x;
      satAdj += w * uHslAdjust[4].y;
      lumAdj += w * uHslAdjust[4].z;
      wSum += w;
    }
  }
  if (uHslTargetCount > 5.5) {
    w = colorWeightRange(hsl.x, uHslCenterHue[5], uHslHueRange[5]);
    if (w > 0.0) {
      hueShift += w * uHslAdjust[5].x;
      satAdj += w * uHslAdjust[5].y;
      lumAdj += w * uHslAdjust[5].z;
      wSum += w;
    }
  }
  if (uHslTargetCount > 6.5) {
    w = colorWeightRange(hsl.x, uHslCenterHue[6], uHslHueRange[6]);
    if (w > 0.0) {
      hueShift += w * uHslAdjust[6].x;
      satAdj += w * uHslAdjust[6].y;
      lumAdj += w * uHslAdjust[6].z;
      wSum += w;
    }
  }
  if (uHslTargetCount > 7.5) {
    w = colorWeightRange(hsl.x, uHslCenterHue[7], uHslHueRange[7]);
    if (w > 0.0) {
      hueShift += w * uHslAdjust[7].x;
      satAdj += w * uHslAdjust[7].y;
      lumAdj += w * uHslAdjust[7].z;
      wSum += w;
    }
  }

  if (wSum <= 0.0) return c;

  hueShift /= wSum;
  satAdj /= wSum;
  lumAdj /= wSum;

  if (hsl.y > 0.04) {
    hsl.x = mod(hsl.x + (hueShift / 100.0) * 40.0 + 360.0, 360.0);
    hsl.y = clamp01(hsl.y * (1.0 + (satAdj / 100.0) * 1.2));
  }
  hsl.z = clamp01(hsl.z + (lumAdj / 100.0) * 0.35);

  return hslToRgb(hsl);
}

void main() {
  vec4 tex = texture2D(uTexture, vUv);
  vec3 c = tex.rgb;

  c = applyExposure(c, uExposure);
  c = applyContrast(c, uContrast);
  c = applySaturation(c, uSaturation);
  c = applyTemperatureTint(c, uTemperature, uTint);
  c = applyLighting(c, uHighlights, uShadows, uWhites, uBlacks);
  c = applyAllHsl(c);

  gl_FragColor = vec4(clamp(c, 0.0, 1.0), tex.a);
}
`
