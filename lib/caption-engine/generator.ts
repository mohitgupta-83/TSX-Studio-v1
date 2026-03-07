import { cleanStyle } from "./styles/clean";
import { tiktokStyle } from "./styles/tiktok";
import { neonStyle } from "./styles/neon";
import { mrbeastStyle } from "./styles/mrbeast";

const STYLES: Record<string, any> = {
  clean: cleanStyle,
  tiktok: tiktokStyle,
  neon: neonStyle,
  mrbeast: mrbeastStyle
};

export function generateCaptionTSX(json: any, styleId: string) {
  if (!json || !json.segments || !Array.isArray(json.segments) || json.segments.length === 0) {
    throw new Error("Invalid or empty segments in JSON");
  }

  const style = STYLES[styleId] || STYLES.clean;

  // Filter out empty texts and map the segments properly
  const sanitizedSegments = json.segments
    .filter((s: any) => s.text && s.text.trim())
    .map((s: any) => ({
      start: s.start,
      end: s.end,
      text: s.text.trim(),
    }));

  if (sanitizedSegments.length === 0) {
    throw new Error("No valid text segments found");
  }

  // Convert styles to a string
  // Animation is mapped to Remotion logic later
  const { animation, ...cssStyles } = style;
  const styleString = JSON.stringify({
    ...cssStyles,
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
    display: "flex",
    width: "100%",
    height: "100%",
  });

  // Determine animation logic
  let animationLogic = "";

  if (animation === "fade") {
    animationLogic = `
            const opacity = interpolate(
              frame,
              [start, start + 10, end - 10, end],
              [0, 1, 1, 0],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            );
            const animatedStyle = { ...${styleString}, opacity };
        `;
  } else if (animation === "bounce") {
    animationLogic = `
            const scale = spring({
              frame: frame - start,
              fps,
              config: { damping: 10, stiffness: 100 }
            });
            const animatedStyle = { ...${styleString}, transform: \`scale(\${scale})\` };
        `;
  } else if (animation === "scale") {
    animationLogic = `
            const scale = interpolate(
              frame,
              [start, start + 10],
              [0.8, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            );
            const opacity = interpolate(
              frame,
              [start, start + 5, end - 5, end],
              [0, 1, 1, 0],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            );
            const animatedStyle = { ...${styleString}, transform: \`scale(\${scale})\`, opacity };
        `;
  } else if (animation === "pop") {
    animationLogic = `
            const scale = spring({
              frame: frame - start,
              fps,
              config: { damping: 12, stiffness: 200 }
            });
            const animatedStyle = { ...${styleString}, transform: \`scale(\${scale})\` };
        `;
  } else {
    // Default no animation
    animationLogic = `const animatedStyle = ${styleString};`;
  }

  const template = `import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";

const segments = ${JSON.stringify(sanitizedSegments, null, 2)};

export default function Captions() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const current = segments.find((s: any) => {
    const startFrame = Math.floor(s.start * fps);
    const endFrame = Math.floor(s.end * fps);
    return frame >= startFrame && frame <= endFrame;
  });

  if (!current) {
    return (
      <AbsoluteFill>
        <Watermark />
      </AbsoluteFill>
    );
  }

  const start = Math.floor(current.start * fps);
  const end = Math.floor(current.end * fps);

  ${animationLogic}

  return (
    <AbsoluteFill>
      <AbsoluteFill style={animatedStyle}>
        {current.text}
      </AbsoluteFill>
      <Watermark />
    </AbsoluteFill>
  );
}

const Watermark = () => (
  <AbsoluteFill style={{
    justifyContent: "flex-end",
    alignItems: "flex-end",
    padding: "40px",
  }}>
    <div style={{
      backgroundColor: "rgba(0, 0, 0, 0.6)",
      color: "rgba(255, 255, 255, 0.8)",
      padding: "12px 24px",
      borderRadius: "16px",
      fontSize: "28px",
      fontWeight: "900",
      fontFamily: "system-ui, sans-serif",
      textTransform: "uppercase",
      fontStyle: "italic",
      letterSpacing: "0.1em",
      boxShadow: "0 0 20px rgba(0,0,0,0.5)"
    }}>
      Made with <span style={{ color: "#27f2ff" }}>TSX</span> Studio
    </div>
  </AbsoluteFill>
);
`;

  return template;
}
