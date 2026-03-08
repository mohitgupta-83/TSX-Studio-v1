/**
 * STEP 8, 10, 13 — Animation Utilities
 * 
 * Deterministic word-level animation calculations and GPU acceleration hints.
 */

/**
 * STEP 13 — Calculate the current active word index from frame position.
 * Uses frame-based deterministic calculation, clamped to prevent overflow.
 */
export function getActiveWordIndex(
    frame: number,
    captionStartFrame: number,
    captionFrameLength: number,
    wordCount: number
): number {
    if (wordCount <= 0) return 0;
    const progress = (frame - captionStartFrame) / captionFrameLength;
    const clamped = Math.max(0, Math.min(1, progress));
    return Math.min(Math.floor(clamped * wordCount), wordCount - 1);
}

/**
 * STEP 8 — Calculate the start frame for a specific word.
 */
export function getWordStartFrame(
    captionStartFrame: number,
    wordIndex: number,
    wordCount: number,
    captionFrameLength: number
): number {
    return captionStartFrame + (wordIndex / wordCount) * captionFrameLength;
}

/**
 * STEP 10 — GPU acceleration CSS properties.
 * Apply these to animated elements for smoother rendering.
 */
export const GPU_ACCELERATED_STYLE: React.CSSProperties = {
    transform: "translateZ(0)",
    willChange: "transform, opacity, filter",
    backfaceVisibility: "hidden" as const,
};

import React from "react";
