/**
 * STEP 9 — Premium Typography System & Font Loader
 * 
 * Ensures all required fonts are fully loaded before any Remotion 
 * composition begins rendering. This prevents layout shift and 
 * ensures deterministic text measurement.
 */

export interface FontConfig {
    family: string;
    weights: number[];
    googleUrl?: string;
}

// Default fonts used by premium caption templates
export const PREMIUM_FONTS: FontConfig[] = [
    { family: "Inter", weights: [400, 500, 600, 700, 800, 900] },
    { family: "Poppins", weights: [400, 500, 600, 700, 800, 900] },
    { family: "Montserrat", weights: [400, 500, 600, 700, 800, 900] },
];

const GOOGLE_FONTS_CSS_URL =
    "https://fonts.googleapis.com/css2?" +
    "family=Inter:wght@400;500;600;700;800;900&" +
    "family=Poppins:wght@400;500;600;700;800;900&" +
    "family=Montserrat:wght@400;500;600;700;800;900&" +
    "display=swap";

const FONT_LINK_ID = "premium-caption-fonts";

let fontsLoadedPromise: Promise<boolean> | null = null;

/**
 * Injects the Google Fonts stylesheet and waits for ALL font faces 
 * to be fully downloaded and available for text measurement.
 * 
 * This is idempotent — calling it multiple times returns the same promise.
 */
export async function loadPremiumFonts(): Promise<boolean> {
    if (fontsLoadedPromise) return fontsLoadedPromise;

    fontsLoadedPromise = (async () => {
        try {
            // 1. Inject stylesheet if not present
            if (!document.getElementById(FONT_LINK_ID)) {
                const link = document.createElement("link");
                link.id = FONT_LINK_ID;
                link.rel = "stylesheet";
                link.href = GOOGLE_FONTS_CSS_URL;
                document.head.appendChild(link);

                // Wait for stylesheet to load
                await new Promise<void>((resolve) => {
                    link.onload = () => resolve();
                    link.onerror = () => resolve(); // Continue even if stylesheet fails
                    setTimeout(resolve, 3000); // 3s timeout
                });
            }

            // 2. Wait for fonts.ready (browser has parsed @font-face declarations)
            await document.fonts.ready;

            // 3. Force the browser to actually download font binaries by requesting each
            const loadPromises: Promise<FontFace[]>[] = [];
            for (const font of PREMIUM_FONTS) {
                for (const weight of font.weights) {
                    loadPromises.push(
                        document.fonts.load(`${weight} 16px "${font.family}"`).catch(() => [])
                    );
                }
            }
            await Promise.all(loadPromises);

            // 4. Final ready gate
            await document.fonts.ready;
            return true;
        } catch {
            return true; // Don't block rendering if fonts fail
        }
    })();

    return fontsLoadedPromise;
}

/**
 * Resets the font loading state. Call this to force a reload 
 * (e.g. when hot-reloading in development).
 */
export function resetFontLoader(): void {
    fontsLoadedPromise = null;
}

/**
 * Premium font smoothing styles that should be applied 
 * to the rendering container.
 */
export const FONT_SMOOTHING_STYLE: React.CSSProperties = {
    WebkitFontSmoothing: "antialiased",
    MozOsxFontSmoothing: "grayscale",
    textRendering: "optimizeLegibility",
};

// Need this for the CSS type
import React from "react";
