"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startupStoryTemplate = void 0;
const codegen_1 = require("../codegen");
exports.startupStoryTemplate = {
    id: "startup-story-v1",
    schema: {
        id: "startup-story-v1",
        name: "Startup Milestone Reveal",
        description: "Elegant glassmorphic card revealing an impressive growth metric or milestone.",
        category: "Stories",
        tags: ["Business", "Growth", "Milestone"],
        width: 1080,
        height: 1920,
        fps: 30,
        durationInFrames: 300,
        fields: [
            { id: "title", type: "text", label: "Announcement Title", defaultValue: "WE JUST HIT" },
            { id: "metric", type: "text", label: "The Milestone", defaultValue: "$100k MRR" },
            { id: "subtitle", type: "textarea", label: "Subtext/Context", defaultValue: "After 12 months of building entirely in public" },
            { id: "primaryColor", type: "color", label: "Primary Accent Color", defaultValue: "#3B82F6" }, // Blue-500
            {
                id: "bgTheme", type: "select", label: "Background Theme", defaultValue: "dark", options: [
                    { label: "Dark Mode", value: "dark" },
                    { label: "Light Mode", value: "light" }
                ]
            }
        ]
    },
    thumbnailGradient: "from-blue-500 to-cyan-500",
    generateCode: (values) => {
        const title = (0, codegen_1.sanitizeString)(values.title, "WE JUST HIT");
        const metric = (0, codegen_1.sanitizeString)(values.metric, "$100k MRR");
        const subtitle = (0, codegen_1.sanitizeString)(values.subtitle, "After 12 months of building entirely in public");
        const primaryColor = values.primaryColor || "#3B82F6";
        const isDark = values.bgTheme !== "light";
        return `import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, spring, Easing } from 'remotion';

export default function StartupStoryTemplate() {
  const frame = useCurrentFrame();
  const fps = 30;
  
  // Base animations
  const bgOpacity = interpolate(frame, [0, 15], [0, 1]);
  
  // Card enters from bottom
  const cardEntry = spring({
    frame: frame - 15,
    fps,
    config: { damping: 14, stiffness: 100 }
  });
  
  const cardY = interpolate(cardEntry, [0, 1], [200, 0]);
  const cardOpacity = interpolate(cardEntry, [0, 1], [0, 1]);
  
  // Text stagger
  const titleOpacity = interpolate(frame - 35, [0, 10], [0, 1], { extrapolateRight: 'clamp' });
  
  // Number reveal
  const metricScale = spring({
    frame: frame - 55,
    fps,
    config: { damping: 12, stiffness: 150 }
  });
  const metricOpacity = interpolate(frame - 50, [0, 10], [0, 1], { extrapolateRight: 'clamp' });
  
  // Subtitle fade
  const subOpacity = interpolate(frame - 80, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
  
  // Particle effect
  const glowY = interpolate(frame, [50, 200], [100, -100]);

  return (
    <AbsoluteFill
      style={{
        background: "${isDark ? '#0A0A0B' : '#F9FAFB'}",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "'Inter', sans-serif"
      }}
    >
      <AbsoluteFill style={{ opacity: bgOpacity }}>
        {/* Abstract Background Gradient */}
        <div style={{
          position: 'absolute',
          width: '150%', height: '150%',
          top: '-25%', left: '-25%',
          background: \`radial-gradient(circle at 50% \${50 + glowY/5}%, ${primaryColor}${isDark ? '20' : '15'} 0%, transparent 50%)\`,
          filter: 'blur(100px)'
        }} />
      </AbsoluteFill>

      {/* Glassmorphic Card */}
      <div style={{
        width: '85%',
        padding: '60px 40px',
        borderRadius: 32,
        background: "${isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.6)'}",
        border: "1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'}",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        backdropFilter: "blur(24px)",
        transform: \`translateY(\${cardY}px)\`,
        opacity: cardOpacity,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center'
      }}>
        
        {/* Title */}
        <h2 style={{
          fontSize: 32,
          fontWeight: 800,
          color: "${isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)'}",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          opacity: titleOpacity,
          margin: "0 0 20px 0"
        }}>
          {"${title}"}
        </h2>

        {/* The Metric */}
        <div style={{
          fontSize: 100,
          fontWeight: 900,
          background: \`linear-gradient(to right, ${primaryColor}, \${'#FFF'})\`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          opacity: metricOpacity,
          transform: \`scale(\${metricScale})\`,
          lineHeight: 1.1,
          letterSpacing: "-0.02em",
          marginBottom: 30,
          width: "100%",
          padding: "10px 0" // Prevent clipping
        }}>
          {"${metric}"}
        </div>

        {/* Subtitle / Context */}
        <p style={{
          fontSize: 28,
          fontWeight: 500,
          color: "${isDark ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)'}",
          lineHeight: 1.5,
          opacity: subOpacity,
          margin: 0,
          maxWidth: "90%"
        }}>
          {"${subtitle}"}
        </p>

      </div>
    </AbsoluteFill>
  );
}`;
    }
};
//# sourceMappingURL=startup-story.js.map