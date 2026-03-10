import { BuiltInTemplate } from "../types";
import { sanitizeString } from "../codegen";

export const motivationQuoteTemplate: BuiltInTemplate = {
    id: "motivation-quote-v1",
    schema: {
        id: "motivation-quote-v1",
        name: "Cinematic Quote",
        description: "Elegant, minimalist quote layout with cinematic background fade.",
        category: "Quotes",
        tags: ["Inspirational", "Clean", "Minimal"],
        width: 1080,
        height: 1920,
        fps: 30,
        durationInFrames: 300,
        fields: [
            { id: "quote", type: "textarea", label: "The Quote", defaultValue: "Discipline equals freedom" },
            { id: "author", type: "text", label: "Author", defaultValue: "Jocko Willink" },
            { id: "accentColor", type: "color", label: "Accent Color", defaultValue: "#ffffff" },
            { id: "fontScale", type: "slider", label: "Text Size", defaultValue: 60, min: 30, max: 100, step: 2 }
        ]
    },
    thumbnailGradient: "from-zinc-800 to-black",
    generateCode: (values) => {
        const quote = sanitizeString(values.quote, "Discipline equals freedom");
        const author = sanitizeString(values.author, "Jocko Willink");
        const accent = values.accentColor || "#ffffff";
        const fontSize = values.fontScale || 60;

        return `import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, spring } from 'remotion';

export default function MotivationQuoteTemplate() {
  const frame = useCurrentFrame();
  const fps = 30;
  
  // Fade in background
  const bgOpacity = interpolate(frame, [0, 30], [0, 1]);
  
  // Cinematic zoom
  const zoom = interpolate(frame, [0, 300], [1.1, 1]);
  
  // Quote marks animation
  const quoteMarkOpacity = interpolate(frame - 15, [0, 20], [0, 0.2], { extrapolateRight: 'clamp' });
  const quoteMarkY = interpolate(frame - 15, [0, 20], [-20, 0], { extrapolateRight: 'clamp' });
  
  // Text stagger (line by line simulation)
  const textOpacity = interpolate(frame - 30, [0, 30], [0, 1], { extrapolateRight: 'clamp' });
  
  // Author reveal
  const authorReveal = spring({
    frame: frame - 70,
    fps,
    config: { damping: 14 }
  });
  
  const authorOpacity = interpolate(authorReveal, [0, 1], [0, 1]);
  const authorX = interpolate(authorReveal, [0, 1], [-30, 0]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#000000",
        fontFamily: "'Inter', sans-serif"
      }}
    >
      {/* Background Layer with Zoom */}
      <AbsoluteFill style={{ 
        opacity: bgOpacity,
        transform: \`scale(\${zoom})\`,
        background: 'radial-gradient(circle at 50% 50%, #1a1a2e 0%, #000000 100%)'
      }} />

      <AbsoluteFill style={{
        justifyContent: "center",
        alignItems: "center",
        padding: "0 10%"
      }}>
        
        {/* Giant background quote marks */}
        <div style={{
          position: 'absolute',
          top: '30%',
          left: '10%',
          fontSize: 400,
          fontFamily: 'serif',
          fontWeight: 900,
          color: '${accent}',
          opacity: quoteMarkOpacity,
          transform: \`translateY(\${quoteMarkY}px)\`,
          lineHeight: 0
        }}>
          "
        </div>

        <div style={{ zIndex: 1, width: '100%' }}>
          {/* Main Quote Text */}
          <h1 style={{
            fontSize: ${fontSize},
            fontWeight: 700,
            color: "#ffffff",
            lineHeight: 1.4,
            opacity: textOpacity,
            margin: "0 0 60px 0",
            textShadow: "0 10px 30px rgba(0,0,0,0.8)"
          }}>
            "${quote}"
          </h1>

          {/* Author Block */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            opacity: authorOpacity,
            transform: \`translateX(\${authorX}px)\`
          }}>
            <div style={{
              width: 40,
              height: 4,
              backgroundColor: "${accent}",
              marginRight: 20
            }} />
            <span style={{
              fontSize: ${fontSize * 0.5},
              fontWeight: 600,
              color: "rgba(255,255,255,0.7)",
              letterSpacing: "0.1em",
              textTransform: "uppercase"
            }}>
              ${author}
            </span>
          </div>
        </div>

      </AbsoluteFill>
    </AbsoluteFill>
  );
}`;
    }
};
