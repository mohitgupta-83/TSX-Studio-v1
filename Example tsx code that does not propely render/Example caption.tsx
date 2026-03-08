import { AbsoluteFill, useCurrentFrame, interpolate, spring } from 'remotion';
import React from 'react';

export const fps = 30;
export const durationInFrames = 8 * fps;

const captions = [
  { start: 0, end: 2.5, text: "Most people think success is luck", emphasis: ['success', 'luck'] },
  { start: 2.5, end: 4.5, text: "But the truth is…", emphasis: ['truth'] },
  { start: 4.5, end: 8, text: "It's just consistency for years.", emphasis: ['consistency', 'years'] },
];

const PremiumCaptions: React.FC = () => {
  const frame = useCurrentFrame();
  const currentTime = frame / fps;

  const currentCaption = captions.find(
    (cap) => currentTime >= cap.start && currentTime < cap.end
  );

  const backgroundY = interpolate(frame, [0, durationInFrames], [0, -50], {
    extrapolateRight: 'clamp',
  });

  const backgroundScale = interpolate(
    Math.sin(frame * 0.02),
    [-1, 1],
    [1, 1.05]
  );

  if (!currentCaption) {
    return (
      <AbsoluteFill
        style={{
          background: 'linear-gradient(135deg, #0f0f1e 0%, #1a1a2e 50%, #16213e 100%)',
        }}
      />
    );
  }

  const words = currentCaption.text.split(' ');
  const captionDuration = currentCaption.end - currentCaption.start;
  const captionProgress = (currentTime - currentCaption.start) / captionDuration;
  const currentWordIndex = Math.floor(captionProgress * words.length);

  const captionStartFrame = currentCaption.start * fps;

  const containerEntrance = spring({
    frame: frame - captionStartFrame,
    fps,
    config: { damping: 20, stiffness: 100 },
  });

  const containerOpacity = interpolate(containerEntrance, [0, 1], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #0f0f1e 0%, #1a1a2e 50%, #16213e 100%)',
          transform: `translateY(${backgroundY}px) scale(${backgroundScale})`,
        }}
      />

      <div
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          background: 'radial-gradient(circle at 50% 50%, rgba(78, 205, 196, 0.1) 0%, transparent 70%)',
          opacity: 0.6,
        }}
      />

      <AbsoluteFill
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 60px',
          opacity: containerOpacity,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '24px',
            maxWidth: '900px',
          }}
        >
          {words.map((word, idx) => {
            const isCurrent = idx === currentWordIndex;
            const isPast = idx < currentWordIndex;
            const wordStartFrame = captionStartFrame + (idx / words.length) * captionDuration * fps;
            const wordFramesSinceStart = frame - wordStartFrame;

            const wordEntrance = spring({
              frame: wordFramesSinceStart,
              fps,
              config: { damping: 15, stiffness: 200 },
            });

            const scale = interpolate(wordEntrance, [0, 1], [0.6, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });

            const opacity = interpolate(wordEntrance, [0, 1], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });

            const yOffset = interpolate(wordEntrance, [0, 1], [40, 0], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });

            const lowerWord = word.toLowerCase().replace(/[.,!?…]/g, '');
            const isEmphasis = currentCaption.emphasis.includes(lowerWord);

            const wordColor = isEmphasis 
              ? (isCurrent ? '#4ECDC4' : '#FF6B6B')
              : '#FFFFFF';

            const glow = isCurrent 
              ? `0 0 40px ${wordColor}, 0 0 60px ${wordColor}50`
              : isEmphasis
              ? `0 0 20px ${wordColor}80`
              : '0 0 20px rgba(255,255,255,0.3)';

            const currentScale = isCurrent ? 1 + Math.sin(frame * 0.3) * 0.05 : 1;

            return (
              <span
                key={idx}
                style={{
                  fontSize: isEmphasis ? 90 : 75,
                  fontWeight: isEmphasis ? 900 : 800,
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                  color: wordColor,
                  letterSpacing: isEmphasis ? '2px' : '1px',
                  textShadow: `${glow}, 0 4px 20px rgba(0,0,0,0.8)`,
                  display: 'inline-block',
                  transform: `scale(${scale * currentScale}) translateY(${yOffset}px)`,
                  opacity: opacity,
                  filter: isCurrent ? 'brightness(1.3)' : isPast ? 'brightness(0.7)' : 'brightness(1)',
                  transition: 'filter 0.3s ease',
                  textTransform: isEmphasis && isCurrent ? 'uppercase' : 'none',
                }}
              >
                {word}
              </span>
            );
          })}
        </div>
      </AbsoluteFill>

      <div
        style={{
          position: 'absolute',
          bottom: 0,
          width: '100%',
          height: '300px',
          background: 'linear-gradient(to top, rgba(15,15,30,0.8) 0%, transparent 100%)',
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};

export default PremiumCaptions;