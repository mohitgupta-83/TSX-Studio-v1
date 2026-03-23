export function generatePremiumTSX(json: any, style: string) {
    const segments = json.segments || [];

    const segmentsJson = JSON.stringify(segments).replace(/'/g, "\\'").replace(/"/g, "'");

    let componentName = "CaptionScene";
    if (style === "tiktok") componentName = "ViralTikTokScene";
    if (style === "clean") componentName = "CleanSubtitleScene";
    if (style === "cinematic") componentName = "CinematicPremiumScene";

    if (style === "tiktok") {
        return `import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring } from "remotion";

export default function ${componentName}() {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const segments = ${segmentsJson};

  return (
    <AbsoluteFill style={{ width: 1080, height: 1920, backgroundColor: "transparent", justifyContent: "center", alignItems: "center" }}>
      {segments.map((seg, segIndex) => {
          const captionStartFrame = seg.start * fps;
          const captionEndFrame = seg.end * fps;
          
          if (frame < captionStartFrame || frame > captionEndFrame + 15) return null; // fade out buffer
          
          const progress = Math.max(0, Math.min(1, (frame - captionStartFrame) / Math.max(1, captionEndFrame - captionStartFrame)));
          const words = seg.words || seg.text.split(" ").map(t => ({ word: t, text: t }));
          
          let currentWordIndex = Math.floor(progress * words.length);
          currentWordIndex = Math.max(0, Math.min(words.length - 1, currentWordIndex));

          return (
             <div key={segIndex} style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "15px", maxWidth: "900px" }}>
                 {words.map((w, wIndex) => {
                     const isCurrentWord = frame >= captionStartFrame && frame <= captionEndFrame && wIndex === currentWordIndex;
                     const isPastWord = wIndex < currentWordIndex || frame > captionEndFrame;
                     
                     let scale = 1;
                     if (isCurrentWord) {
                         scale = spring({ frame: frame - captionStartFrame, fps, config: { damping: 10, mass: 0.5, stiffness: 200 } }) * 0.2 + 1;
                     } else if (isPastWord) {
                         scale = 1;
                     } else {
                         scale = 0.8;
                     }

                     const text = w.word || w.text;
                     const opacity = isPastWord ? 0.3 : (isCurrentWord ? 1 : 0);
                     const pulseActive = isCurrentWord ? Math.sin(frame / 2) * 5 : 0;
                     const translateY = isCurrentWord ? pulseActive : (isPastWord ? 0 : 40);

                     return (
                         <span 
                             key={wIndex} 
                             style={{ 
                                 opacity,
                                 transform: \`scale(\${scale}) translateY(\${translateY}px) translateZ(0)\`,
                                 transition: "opacity 0.1s ease",
                                 fontSize: "80px",
                                 fontWeight: 900,
                                 textTransform: "uppercase",
                                 WebkitFontSmoothing: "antialiased",
                                 letterSpacing: "2px",
                                 textShadow: isCurrentWord ? "0 0 20px rgba(255,255,255,0.8), 0 0 40px rgba(255,100,200,0.5)" : "none",
                                 color: isCurrentWord ? "#fff" : "#ccc",
                                 fontFamily: "'Inter', sans-serif"
                             }}
                         >
                           {text}
                         </span>
                     )
                 })}
             </div>
          );
      })}
    </AbsoluteFill>
  );
}`;
    }

    if (style === "clean") {
        return `import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";

export default function ${componentName}() {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const segments = ${segmentsJson};

  return (
    <AbsoluteFill style={{ width: 1080, height: 1920, backgroundColor: "transparent", justifyContent: "flex-end", paddingBottom: "300px", alignItems: "center" }}>
      {segments.map((seg, segIndex) => {
          const captionStartFrame = seg.start * fps;
          const captionEndFrame = seg.end * fps;
          
          if (frame < captionStartFrame - 15 || frame > captionEndFrame + 15) return null;
          
          const fadeIn = interpolate(frame, [captionStartFrame - 10, captionStartFrame], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          const fadeOut = interpolate(frame, [captionEndFrame, captionEndFrame + 10], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          
          const opacity = frame > captionEndFrame ? fadeOut : (frame < captionStartFrame ? fadeIn : 1);

          return (
             <div 
                 key={segIndex} 
                 style={{ 
                     opacity,
                     display: "flex", 
                     flexWrap: "wrap", 
                     justifyContent: "center", 
                     gap: "10px", 
                     maxWidth: "800px",
                     fontSize: "60px",
                     fontWeight: 700,
                     WebkitFontSmoothing: "antialiased",
                     letterSpacing: "1px",
                     textShadow: "0 2px 4px rgba(0,0,0,0.5)",
                     color: "#fff",
                     fontFamily: "'Roboto', sans-serif",
                     transform: "translateZ(0)",
                     textAlign: "center"
                 }}
             >
                 {seg.text}
             </div>
          );
      })}
    </AbsoluteFill>
  );
}`;
    }

    // cinematic
    return `import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

export default function ${componentName}() {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const segments = ${segmentsJson};

  return (
    <AbsoluteFill style={{ width: 1080, height: 1920, backgroundColor: "transparent", justifyContent: "center", alignItems: "center" }}>
      {segments.map((seg, segIndex) => {
          const captionStartFrame = seg.start * fps;
          const captionEndFrame = seg.end * fps;
          
          if (frame < captionStartFrame - 5 || frame > captionEndFrame + 15) return null;
          
          const progress = Math.max(0, Math.min(1, (frame - captionStartFrame) / Math.max(1, captionEndFrame - captionStartFrame)));
          const words = seg.words || seg.text.split(" ").map(t => ({ word: t, text: t }));
          
          let currentWordIndex = Math.floor(progress * words.length);
          currentWordIndex = Math.max(0, Math.min(words.length - 1, currentWordIndex));

          return (
             <div key={segIndex} style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "20px", maxWidth: "900px" }}>
                 {words.map((w, wIndex) => {
                     const isCurrentWord = frame >= captionStartFrame && frame <= captionEndFrame && wIndex === currentWordIndex;
                     
                     const entrance = spring({ frame: frame - captionStartFrame - (wIndex * 2), fps, config: { damping: 12, mass: 0.5 } });
                     const translateY = interpolate(entrance, [0, 1], [40, 0]);
                     const opacityEntrance = interpolate(entrance, [0, 1], [0, 1]);
                     
                     const scale = isCurrentWord ? 1.05 : 1;
                     const text = w.word || w.text;
                     
                     const glow = isCurrentWord ? "0 0 20px rgba(255,255,255,0.4), 0 5px 30px rgba(255,200,100,0.6)" : "0 5px 15px rgba(0,0,0,0.9)";
                     const color = isCurrentWord ? "#fff" : "#eee";

                     return (
                         <span 
                             key={wIndex} 
                             style={{ 
                                 opacity: opacityEntrance,
                                 transform: \`translateY(\${translateY}px) scale(\${scale}) translateZ(0)\`,
                                 fontSize: "90px",
                                 fontWeight: 800,
                                 textTransform: "uppercase",
                                 WebkitFontSmoothing: "antialiased",
                                 letterSpacing: "4px",
                                 textShadow: glow,
                                 color,
                                 fontFamily: "'Outfit', sans-serif"
                             }}
                         >
                           {text}
                         </span>
                     )
                 })}
             </div>
          );
      })}
    </AbsoluteFill>
  );
}`;
}
