/**
 * STEP 11, 12 — Glow/Shadow Engine & Caption Style System
 */

// STEP 11 — Glow presets
export interface GlowPreset {
    name: string;
    getTextShadow: (color: string, isActive: boolean) => string;
    getFilter: (isActive: boolean) => string;
}

export const GLOW_PRESETS: Record<string, GlowPreset> = {
    softGlow: {
        name: "Soft Glow",
        getTextShadow: (color, isActive) =>
            isActive
                ? `0 0 20px ${color}, 0 0 40px ${color}80, 0 4px 20px rgba(0,0,0,0.8)`
                : `0 0 10px ${color}60, 0 4px 20px rgba(0,0,0,0.8)`,
        getFilter: (isActive) => (isActive ? "brightness(1.2)" : "brightness(1)"),
    },
    neonGlow: {
        name: "Neon Glow",
        getTextShadow: (color, isActive) =>
            isActive
                ? `0 0 40px ${color}, 0 0 60px ${color}50, 0 0 80px ${color}30, 0 4px 20px rgba(0,0,0,0.8)`
                : `0 0 20px ${color}80, 0 4px 20px rgba(0,0,0,0.8)`,
        getFilter: (isActive) => (isActive ? "brightness(1.3)" : "brightness(1)"),
    },
    emphasisGlow: {
        name: "Emphasis Glow",
        getTextShadow: (color, isActive) =>
            isActive
                ? `0 0 30px ${color}, 0 0 50px ${color}60, 0 2px 15px rgba(0,0,0,0.9)`
                : `0 0 15px ${color}40, 0 2px 12px rgba(0,0,0,0.7)`,
        getFilter: (isActive) => (isActive ? "brightness(1.25)" : "brightness(0.85)"),
    },
};

// STEP 12 — Caption style system
export interface CaptionStylePreset {
    name: string;
    fontSize: number;
    emphasisFontSize: number;
    fontWeight: number;
    emphasisFontWeight: number;
    letterSpacing: string;
    emphasisLetterSpacing: string;
    fontFamily: string;
    glowPreset: string;
    animationSpeed: number; // spring damping multiplier
    activeColor: string;
    emphasisColor: string;
    defaultColor: string;
}

export const CAPTION_STYLE_PRESETS: Record<string, CaptionStylePreset> = {
    premium: {
        name: "Premium",
        fontSize: 75,
        emphasisFontSize: 90,
        fontWeight: 800,
        emphasisFontWeight: 900,
        letterSpacing: "1px",
        emphasisLetterSpacing: "2px",
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
        glowPreset: "neonGlow",
        animationSpeed: 1,
        activeColor: "#4ECDC4",
        emphasisColor: "#FF6B6B",
        defaultColor: "#FFFFFF",
    },
    clean: {
        name: "Clean",
        fontSize: 64,
        emphasisFontSize: 72,
        fontWeight: 700,
        emphasisFontWeight: 800,
        letterSpacing: "0.5px",
        emphasisLetterSpacing: "1px",
        fontFamily: "Inter, sans-serif",
        glowPreset: "softGlow",
        animationSpeed: 0.8,
        activeColor: "#FFFFFF",
        emphasisColor: "#60A5FA",
        defaultColor: "#D1D5DB",
    },
    tiktok: {
        name: "TikTok",
        fontSize: 80,
        emphasisFontSize: 96,
        fontWeight: 900,
        emphasisFontWeight: 900,
        letterSpacing: "0px",
        emphasisLetterSpacing: "-1px",
        fontFamily: "Poppins, sans-serif",
        glowPreset: "emphasisGlow",
        animationSpeed: 1.2,
        activeColor: "#FF0050",
        emphasisColor: "#00F2EA",
        defaultColor: "#FFFFFF",
    },
    neon: {
        name: "Neon",
        fontSize: 70,
        emphasisFontSize: 85,
        fontWeight: 800,
        emphasisFontWeight: 900,
        letterSpacing: "2px",
        emphasisLetterSpacing: "3px",
        fontFamily: "Montserrat, sans-serif",
        glowPreset: "neonGlow",
        animationSpeed: 0.9,
        activeColor: "#39FF14",
        emphasisColor: "#FF00FF",
        defaultColor: "#E0E0E0",
    },
    minimal: {
        name: "Minimal",
        fontSize: 56,
        emphasisFontSize: 64,
        fontWeight: 600,
        emphasisFontWeight: 700,
        letterSpacing: "1px",
        emphasisLetterSpacing: "1.5px",
        fontFamily: "Inter, sans-serif",
        glowPreset: "softGlow",
        animationSpeed: 0.7,
        activeColor: "#FBBF24",
        emphasisColor: "#F59E0B",
        defaultColor: "#9CA3AF",
    },
};
