---
name: remotion
description: Guidelines and best practices for creating and animating video templates using Remotion in TSX Studio.
---

# Remotion Video Animation Skillset

When asked to create, refactor, or enhance a Remotion video template in TSX Studio, you must follow these rules and core primitives to generate stunning, high-performance, and error-free animations.

## 1. Core Principles of Remotion
Remotion allows you to write videos in React. The foundation of any animation relies on current time (`useCurrentFrame`) and configuration (`useVideoConfig`).

You MUST import these from `remotion` and NOT from any DOM hooks:
```tsx
import { 
  useCurrentFrame, 
  useVideoConfig, 
  interpolate, 
  spring, 
  AbsoluteFill, 
  Sequence,
  Audio,
  Img
} from 'remotion';
```

**CRITICAL: Never use `useState` or `useEffect` for animation-driven progress.** Since rendering runs arbitrarily across frames, the output MUST be perfectly deterministic math based on the frame index. 

## 2. Reading Configuration
Inside your main Composition component, read the environment:
```tsx
const frame = useCurrentFrame();
const { fps, durationInFrames, width, height } = useVideoConfig();
```
*(Always utilize this rather than hard-coding dimensions, except for explicit layout constraints!)*

## 3. High-Quality Animations with Spring and Interpolate

### Spring Physics (Best for organic bounce/scaling/movement)
Instead of linear css transitions, use `spring()`:
```tsx
const scale = spring({
  frame,
  fps,
  config: {
    damping: 12,
    mass: 0.5,
    stiffness: 100,
  },
});
```

### Interpolation (Best for fading, sliding, linear property shifts)
Map a frame range to a value range using `interpolate`:
```tsx
// Fade in over the first 30 frames
const opacity = interpolate(
  frame,
  [0, 30], // Inputs (frame range)
  [0, 1],  // Outputs (opacity range)
  { extrapolateRight: 'clamp' } // NEVER forget this clamp to avoid overshoot bounds!
);

// Slide up from bottom
const translateY = interpolate(frame, [0, 20], [100, 0], { extrapolateRight: 'clamp' });
```

## 4. Organizing Time Using `<Sequence>`
Do not try to manage complex math if elements enter/exit sequentially! Cut the composition logically using `<Sequence>`.

```tsx
// This component starts appearing only at frame 60
<Sequence from={60} durationInFrames={120}>
   <MySubtitle />
</Sequence>
```
If inside `<MySubtitle />` you call `useCurrentFrame()`, the frame starts at `0` for that sequence! This makes component isolation perfect.

## 5. Layout and Styling
- Rely strictly on inline styles or React standard styling objects.
- Prefer Flexbox for centering. 
- Use `AbsoluteFill` for containers that must cover the entire canvas perfectly.

```tsx
<AbsoluteFill style={{ backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center' }}>
   {/* content */}
</AbsoluteFill>
```

## 6. TSX Studio Specific Requirements
- **Export Syntax:** TSX Studio intelligently attempts to hook into your main composition. While `export default function MyComponent()` is strongly recommended as standard practice, TSX Studio is deeply integrated and will automatically fall back to intelligently mounting the *last* named exported component (e.g. `export const MyComponent = ...`) it finds in the file if a default doesn't exist. So standard Remotion copy/paste snippets work natively!
- All TSX projects are injected with `<LivePreview code={...} />`. The code must be self-contained in a single file representation.
- Ensure your output renders natively React and does not rely on local `import { Image } from 'next/image'`, `fs`, or node-only packages. Use native `<img>` or Remotion's `<Img>`.

## 7. Performance & High-End Aesthetics
To ensure user satisfaction on "stunning things":
- Apply **Glow Effects**: `boxShadow: "0 0 40px rgba(0,255,200,0.5)"`
- Apply **Text Shadow**: `textShadow: "0px 4px 20px rgba(0,0,0,0.8)"`
- Implement **Subtle Continuous Background Scaling**: 
  ```tsx 
  const bgScale = interpolate(frame, [0, durationInFrames], [1, 1.1]);
  ```
- Make text pop-ins feel snappy using bouncy springs.
- Avoid flat colors. Use **Radial/Linear Gradients**.
  `background: 'linear-gradient(135deg, #1A1A24 0%, #0D0D14 100%)'`

Always deliver robust, deterministic React animation code when the user requests a new template.
