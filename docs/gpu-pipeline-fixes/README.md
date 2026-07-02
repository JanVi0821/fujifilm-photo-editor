# GPU 渲染管线优化与问题修复总结

本文档汇总富士胶片 Web 编辑器在 GPU 性能方案（regl + WebGL）落地过程中遇到的问题、解决方案及所用技术。

---

## 目录

1. [regl 纹理上传失败（invalid texture shape）](#1-regl-纹理上传失败invalid-texture-shape)
2. [像素读取失败（invalid width for read pixels）](#2-像素读取失败invalid-width-for-read-pixels)
3. [预览尺寸抖动](#3-预览尺寸抖动)
4. [滤镜与参数调整不生效](#4-滤镜与参数调整不生效)
5. [图片上下颠倒](#5-图片上下颠倒)
6. [处理后图片叠加在原图且半透明](#6-处理后图片叠加在原图且半透明)
7. [架构优化总览](#7-架构优化总览)

---

## 1. regl 纹理上传失败（invalid texture shape）

### 问题是什么

- 控制台报错：`(regl) invalid texture shape`，发生在 `GpuRenderer.uploadSource`
- 图片尚未完全解码（`naturalWidth = 0`）时就触发了 GPU 上传
- 大图（如 7728×5152）经 2D Canvas 转 `ImageData` 再上传时容易失败
- 纹理在 GPU 绘制完成前被 `destroy()`，导致源图 FBO 为空

### 解决方案是什么

- 在 `uploadSource` 前检查 `image.complete` 且 `naturalWidth/Height > 0`
- 在 `runFullPipeline` 中调用 `await img.decode()` 确保图片已解码
- 使用 `regl.texture({ data: image, flipY: true })` 直接从 `HTMLImageElement` 上传，避免 2D 中转
- **持久保留** `sourceTexture`，不在上传后立即销毁
- 分离 `imageUrl` 与 `filter` 的 effect，避免换图时用旧图跑管线
- GPU 失败时自动回退 CPU 路径

### 用到了什么技术

- **regl** 纹理 API（`flipY`、HTMLImageElement 直传）
- **Image.decode()** 异步解码守卫
- **React useRef** 做图片就绪判断（`isImageReady`）
- **try/catch + 降级策略**（GPU → CPU）

---

## 2. 像素读取失败（invalid width for read pixels）

### 问题是什么

- 控制台报错：`(regl) invalid width for read pixels`，发生在 `readScreenPixels`
- 渲染分辨率（如 7728px）与 WebGL canvas 实际缓冲区尺寸（CSS 显示尺寸，约几百～一千多 px）不一致
- regl 每次绘制前会根据 canvas 的 `clientWidth` 自动重置缓冲区，覆盖手动设置的尺寸

### 解决方案是什么

- **离屏 WebGL Canvas**：regl 在不可见的 `glCanvas` 上工作，可见 canvas 用 2D 显示
- 所有调色结果写入 **FBO**（`adjustPreview` / `adjustFull`），不再依赖屏幕帧缓冲
- 直方图从 `adjustPreview` FBO 读取，而非从屏幕 `readPixels`
- 显示分辨率固定为预览尺寸（最长边 1920px），与 CSS 布局解耦

### 用到了什么技术

- **regl Framebuffer（FBO）** 离屏渲染
- **双 Canvas 架构**（离屏 WebGL + 可见 2D display canvas）
- **regl.read({ framebuffer })** 从 FBO 读像素
- **预览降采样**（`getPreviewSize`，最长边 1920px）

---

## 3. 预览尺寸抖动

### 问题是什么

- 拖动滑块时图片尺寸在 preview（1920px）与 full（7728px）之间切换
- canvas 内部分辨率跟着跳，视觉上忽大忽小

### 解决方案是什么

- **屏幕始终显示预览分辨率**（最长边 ≤ 1920px）
- 拖动时：内部以 preview 质量处理
- 松开时：内部以 full 质量处理，但显示仍 downscale 到预览尺寸
- 导出时：从 `adjustFull` FBO 读取全分辨率

### 用到了什么技术

- **RenderQuality** 类型（`'preview' | 'full'`）
- **isAdjustingRef** 配合 `onAdjustStart` / `onAdjustEnd` 切换质量
- **FBO 链**：`film` → `previewFilm` → `adjustPreview` / `adjustFull`
- **exportFullResolution()** 全分辨率导出

---

## 4. 滤镜与参数调整不生效

### 问题是什么

- 首帧有滤镜效果，但后续切换滤镜、拖动 Strength、调整右侧参数均无变化
- 显示停留在第一帧

### 解决方案是什么

- **根因**：`blitToGlCanvas` 往离屏 canvas 默认帧缓冲写入时，regl `poll()` 将 `clientWidth=0` 的离屏 canvas 重置为 0×0，写入失败
- **修复**：`presentFromFbo()` 直接从 `adjustPreview` FBO 读取像素，用 `putImageData` 画到显示 canvas
- 增加 **pipelineReady** 状态，管线完成后重新触发 strength/adjustments 的 effect
- 增加 **pipelineGenRef** 代数计数，防止快速切换滤镜时旧异步任务覆盖新结果
- 移除 adjustments effect 中的 RAF 防抖，改为直接渲染

### 用到了什么技术

- **regl.read + putImageData** 显示路径
- **React useState（pipelineReady）** 驱动 effect 重跑
- **异步管线代数（generation counter）** 防竞态
- **useCallback 依赖拆分**（filter / imageUrl / adjustments 各自独立 effect）

---

## 5. 图片上下颠倒

### 问题是什么

- 处理后的图片相对原图上下颠倒（180° 翻转感）
- 在 `presentFromFbo` 加/减 Y 轴翻转均无法单独解决，因整条管线坐标系不一致

### 解决方案是什么

- **GPU 内部**：纹理上传使用 `flipY: true`，顶点着色器保持 OpenGL 默认 UV（`vUv = position * 0.5 + 0.5`）
- **显示/导出**：`readFboPixels()` 读取 FBO 后做 **Y 轴行翻转**（WebGL 原点在左下，Canvas 2D 原点在左上）
- 统一在 `readFboPixels` 中处理翻转与 alpha 修正，供预览和导出共用

### 用到了什么技术

- **OpenGL 纹理坐标系** vs **Canvas 2D 坐标系** 的差异处理
- **regl flipY** 纹理上传选项
- **CPU 行翻转**（`readFboPixels` 中按行拷贝）
- **ImageData + putImageData** 显示

---

## 6. 处理后图片叠加在原图且半透明

### 问题是什么

- 处理后的 canvas 叠在原图 `<img>` 上，且能透过看到底部原图
- 图片仍可能上下颠倒

### 解决方案是什么

| 原因 | 修复 |
|------|------|
| 处理中 canvas `opacity: 0.7` | 移除，处理中不再降低透明度 |
| 原图与 canvas 同在 flex 布局中可能同时可见 | `preview-stack` 容器，用 `display: none/block` 互斥显示 |
| FBO 读出 alpha 可能为 0 | `readFboPixels` 强制所有像素 `alpha = 255` |
| canvas 默认透明背景 | `.preview-output { background: #000 }` |

- 正常预览：只显示 canvas
- 按住 Before/After：只显示原图 `<img>`

### 用到了什么技术

- **React 条件渲染**（`display: showBefore ? 'block' : 'none'`）
- **CSS 层叠控制**（`.preview-stack`）
- **RGBA alpha 通道修正**
- **Before/After 对比交互**（`onMouseDown` / `onMouseUp`）

---

## 7. 架构优化总览

### 最终 GPU 渲染管线

```
原图 (HTMLImageElement)
    ↓ uploadSource (flipY: true)
source FBO
    ↓ LUT Pass
lut FBO
    ↓ Strength Blend
film FBO
    ↓ downscale (预览时)
previewFilm FBO
    ↓ Adjustments Shader
adjustPreview / adjustFull FBO
    ↓ readFboPixels (Y 翻转 + alpha=255)
显示 canvas (2D putImageData)
```

### 涉及的核心文件

| 文件 | 职责 |
|------|------|
| `src/gpu/renderer.ts` | GpuRenderer 主类、FBO 管理、显示与导出 |
| `src/gpu/shaders.ts` | GLSL 着色器（LUT / Blend / Adjustments） |
| `src/gpu/lutAtlas.ts` | .cube LUT → 2D 纹理图集 |
| `src/gpu/downscale.ts` | 预览尺寸计算 |
| `src/hooks/useImageProcessing.ts` | 管线调度、预览/全分辨率、直方图节流 |
| `src/components/PreviewArea.tsx` | 预览区层叠与 Before/After |

### 技术栈汇总

| 类别 | 技术 |
|------|------|
| GPU 渲染 | **regl**、**WebGL 1.0**、**GLSL** |
| 离屏渲染 | **Framebuffer Object (FBO)** |
| 色彩处理 | **3D LUT (.cube)**、纹理图集、强度混合 |
| 调色 | 自定义 **Adjustments Shader**（Exposure / Contrast / HSL 等） |
| 显示 | **Canvas 2D**（`putImageData`） |
| 性能 | 预览降采样（1920px）、拖动 preview / 松开 full、直方图 300ms 节流 |
| 前端框架 | **React 19**、**TypeScript**、**Vite 7** |
| 降级 | GPU 失败自动回退 **CPU**（`ImageData` + 纯函数调色） |

### 性能策略（方案 B/C）

- 拖动滑块：最长边 1920px 预览
- 松开滑块 / 导出：全分辨率处理
- 直方图：300ms 节流更新
- LUT 缓存：`lutCacheRef` 避免重复 fetch

---

## 相关提交阶段

本次修复对应项目 **阶段 P1：GPU 性能优化**，在完成功能阶段 1～5（布局、滤镜强度、BASIC/LIGHTING/HSL 调色）之后进行。
