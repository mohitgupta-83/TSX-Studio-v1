export type SceneStyle = "gradient_motion" | "dark_cinematic" | "light_minimal" | "abstract_animation";

export function getSceneBackground(style: SceneStyle): string {
    switch(style) {
        case "dark_cinematic":
            return `<AbsoluteFill style={{ backgroundColor: '#0A0A0B', backgroundImage: 'radial-gradient(circle at center, #1A1A1D 0%, #0A0A0B 100%)' }} />`;
        case "light_minimal":
            return `<AbsoluteFill style={{ backgroundColor: '#F9FAFB', backgroundImage: 'linear-gradient(to bottom, #F9FAFB, #F3F4F6)' }} />`;
        case "abstract_animation":
            // A simple gradient with some motion logic could be better, but sticking to 0-cost local HTML/CSS logic
            return `<AbsoluteFill style={{ background: 'linear-gradient(45deg, #FF6B6B, #4ECDC4)', opacity: 0.9 }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 60%)' }} />
        </AbsoluteFill>`;
        case "gradient_motion":
        default:
            return `<AbsoluteFill style={{ backgroundImage: 'linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab)' }} />`;
    }
}
