export const CAPTION_STYLES = {
    tiktok: {
        fontSize: "80px",
        fontWeight: 900,
        textTransform: "uppercase" as const,
        WebkitFontSmoothing: "antialiased" as const,
        letterSpacing: "2px",
        textShadow: "0 0 20px rgba(255,255,255,0.8), 0 0 40px rgba(255,100,200,0.5)",
        fontFamily: "'Inter', sans-serif"
    },
    clean: {
        fontSize: "60px",
        fontWeight: 700,
        WebkitFontSmoothing: "antialiased" as const,
        letterSpacing: "1px",
        textShadow: "0 2px 4px rgba(0,0,0,0.5)",
        fontFamily: "'Roboto', sans-serif"
    },
    cinematic: {
        fontSize: "90px",
        fontWeight: 800,
        textTransform: "uppercase" as const,
        WebkitFontSmoothing: "antialiased" as const,
        letterSpacing: "4px",
        textShadow: "0 0 20px rgba(255,255,255,0.4), 0 5px 30px rgba(255,200,100,0.6)",
        fontFamily: "'Outfit', sans-serif"
    }
};
