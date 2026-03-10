"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.viralCaptionTemplate = void 0;
const codegen_1 = require("../codegen");
exports.viralCaptionTemplate = {
    id: "viral-captions-v1",
    schema: {
        id: "viral-captions-v1",
        name: "Viral Pop Captions",
        description: "High impact, TikTok style captions that sequentially highlight per line.",
        category: "Captions",
        tags: ["Social Media", "Hooks", "Viral"],
        width: 1080,
        height: 1920,
        fps: 30,
        durationInFrames: 300,
        fields: [
            {
                id: "line1",
                type: "textarea",
                label: "First Line",
                defaultValue: "MOST PEOPLE THINK SUCCESS",
                placeholder: "Enter line 1...",
            },
            {
                id: "line2",
                type: "textarea",
                label: "Second Line",
                defaultValue: "IS JUST LUCK",
                placeholder: "Enter line 2...",
            },
            {
                id: "highlightColor",
                type: "color",
                label: "Highlight Color",
                defaultValue: "#FFD54F" // Yellow
            },
            {
                id: "fontSize",
                type: "slider",
                label: "Font Size",
                defaultValue: 80,
                min: 40,
                max: 150,
                step: 5
            },
            {
                id: "bgStyle",
                type: "select",
                label: "Background Style",
                defaultValue: "gradient",
                options: [
                    { label: "Dark Gradient", value: "gradient" },
                    { label: "Solid Black", value: "solid" },
                    { label: "Transparent", value: "transparent" }
                ]
            }
        ]
    },
    thumbnailGradient: "from-blue-600 to-indigo-900",
    generateCode: (values) => {
        const line1 = (0, codegen_1.sanitizeString)(values.line1, "MOST PEOPLE THINK SUCCESS");
        const line2 = (0, codegen_1.sanitizeString)(values.line2, "IS JUST LUCK");
        const highlightColor = values.highlightColor || "#FFD54F";
        const fontSize = values.fontSize || 80;
        const bgStyle = values.bgStyle || "gradient";
        const bgStylesUrl = {
            gradient: "linear-gradient(135deg, #0f0f1e, #16213e)",
            solid: "#000000",
            transparent: "transparent"
        };
        const bg = bgStylesUrl[bgStyle] || bgStylesUrl.gradient;
        return `import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';

export default function ViralCaptionTemplate() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Timing
  const line1Start = 10;
  const line1End = 90;
  
  const line2Start = 100;
  const line2duration = 60;
  
  // Animations
  const line1Scale = spring({
    frame: Math.max(0, frame - line1Start),
    fps,
    config: { damping: 12, mass: 0.5, stiffness: 150 }
  });
  
  const line1Opacity = interpolate(
    Math.max(0, frame - line1Start),
    [0, 10],
    [0, 1],
    { extrapolateRight: "clamp" }
  );
  
  const line2Scale = spring({
    frame: Math.max(0, frame - line2Start),
    fps,
    config: { damping: 10, mass: 0.8, stiffness: 200 }
  });

  return (
    <AbsoluteFill
      style={{
        background: "${bg}",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "'Inter', sans-serif"
      }}
    >
      <div 
        style={{ 
          fontSize: ${fontSize}, 
          fontWeight: 900, 
          color: "white", 
          textAlign: "center",
          textTransform: "uppercase",
          opacity: line1Opacity,
          transform: \`scale(\${line1Scale})\`,
          textShadow: "0px 10px 20px rgba(0,0,0,0.5)",
          marginBottom: 40,
          maxWidth: "80%",
          lineHeight: 1.1
        }}
      >
        {"${line1}"}
      </div>

      <div
        style={{
          fontSize: ${fontSize * 1.1},
          fontWeight: 900,
          color: "${highlightColor}",
          textAlign: "center",
          textTransform: "uppercase",
          opacity: frame >= line2Start ? 1 : 0,
          transform: \`scale(\${line2Scale}) rotate(-2deg)\`,
          textShadow: \`0px 0px 40px ${highlightColor}66, 0px 10px 20px rgba(0,0,0,0.8)\`,
          maxWidth: "90%",
          lineHeight: 1.1
        }}
      >
        {"${line2}"}
      </div>
    </AbsoluteFill>
  );
}`;
    }
};
//# sourceMappingURL=viral-caption.js.map