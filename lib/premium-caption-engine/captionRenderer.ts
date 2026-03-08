/**
 * STEP 7 — Caption Rendering Engine
 * 
 * Deterministic caption segment renderer with word-level timing,
 * spring animations, glow effects, and highlight management.
 */
export { loadPremiumFonts, resetFontLoader, FONT_SMOOTHING_STYLE } from "./fontLoader";
export { getActiveWordIndex, getWordStartFrame, GPU_ACCELERATED_STYLE } from "./animationUtils";
export { GLOW_PRESETS, CAPTION_STYLE_PRESETS } from "./captionStyles";

export type { FontConfig } from "./fontLoader";
export type { GlowPreset, CaptionStylePreset } from "./captionStyles";
