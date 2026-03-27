export const CINEMATIC_REVEAL = `import { AbsoluteFill, useCurrentFrame, interpolate, spring } from 'remotion';
import React from 'react';

export const fps = 30;
export const durationInFrames = 10 * fps;

const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };
const accent = '#818cf8';

export default function CinematicReveal() {
  const frame = useCurrentFrame();
  const t = frame / fps;
  const heroOpacity = interpolate(frame, [20, 40], [0, 1], clamp);
  const heroY = interpolate(spring({ frame: Math.max(0, frame - 28), fps, config: { damping: 24, stiffness: 130, mass: 1.12 }, from: 0, to: 1 }), [0, 1], [110, 0], clamp);

  return (
    <AbsoluteFill style={{ background: 'linear-gradient(168deg, #06050f 0%, #050409 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ opacity: heroOpacity, transform: \`translateY(\${heroY}px)\`, textAlign: 'center' }}>
            <h1 style={{ fontSize: 148, fontWeight: 900, color: 'white', letterSpacing: '-5px', textShadow: \`0 0 80px \${accent}44\` }}>TSX Studio</h1>
            <p style={{ fontSize: 42, color: 'rgba(255,255,255,0.48)' }}>Create motion graphics with code</p>
        </div>
    </AbsoluteFill>
  );
}`;
