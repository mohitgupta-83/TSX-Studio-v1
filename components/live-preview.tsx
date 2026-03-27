"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import * as Babel from "@babel/standalone";
import * as Remotion from "remotion";
import { Player, PlayerRef } from "@remotion/player";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loadPremiumFonts, FONT_SMOOTHING_STYLE } from "@/lib/premium-caption-engine/fontLoader";

// ============================================================
// STEP 9 — Error Boundary (protects renderer from user errors)
// ============================================================
class ErrorBoundary extends React.Component<
    { children: React.ReactNode; onError: (e: Error) => void },
    { hasError: boolean }
> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError() {
        return { hasError: true };
    }
    componentDidCatch(error: Error) {
        this.props.onError(error);
    }
    render() {
        if (this.state.hasError) return null;
        return this.props.children;
    }
}

// ============================================================
// STEP 3 — Bundle hash for cache invalidation
// ============================================================
function hashCode(str: string): string {
    let hash = 0;
    for (let i = 0, len = str.length; i < len; i++) {
        const chr = str.charCodeAt(i);
        hash = (hash << 5) - hash + chr;
        hash |= 0;
    }
    return hash.toString(36);
}

// ============================================================
// STEP 5 — Standard composition defaults
// ============================================================
const DEFAULT_WIDTH = 1080;
const DEFAULT_HEIGHT = 1920;
const DEFAULT_FPS = 30;
const DEFAULT_DURATION = 300;

interface LivePreviewProps {
    code: string;
    isValid: boolean;
    width: number;
    height: number;
    fps?: number;
    durationInFrames?: number;
}

export function LivePreview({
    code,
    isValid,
    width = DEFAULT_WIDTH,
    height = DEFAULT_HEIGHT,
    fps: defaultFps = DEFAULT_FPS,
    durationInFrames: defaultDuration = DEFAULT_DURATION,
}: LivePreviewProps) {
    // ============================================================
    // STEP 1 — Preview instance counter for forced remount
    // ============================================================
    const previewInstanceRef = useRef(0);

    const [fontsReady, setFontsReady] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<"idle" | "compiling" | "ready" | "error">("idle");

    // The compiled component and its unique key, stored together
    const [preview, setPreview] = useState<{
        Component: React.FC | null;
        instanceKey: string;
        fps: number;
        duration: number;
    }>({ Component: null, instanceKey: "", fps: defaultFps, duration: defaultDuration });

    const playerRef = useRef<PlayerRef>(null);

    // ============================================================
    // STEP 9 — Font Loading (runs once on mount)
    // ============================================================
    useEffect(() => {
        loadPremiumFonts().then(() => setFontsReady(true));
    }, []);

    // ============================================================
    // STEP 7 — Parse FPS and duration from code deterministically
    // ============================================================
    const parseCompositionConfig = useCallback(
        (src: string) => {
            // Multi-pass arithmetic evaluator — resolves chained variable dependencies
            // and handles Math.ceil/floor/round safely without arbitrary eval.
            const varMap: Record<string, number> = {};

            // Seed fps from explicit declaration first
            const fpsAssign = src.match(/(?:const|let|var)\s+fps\s*=\s*(\d+)/);
            const fpsProp = src.match(/fps\s*:\s*(\d+)/);
            if (fpsAssign) varMap['fps'] = parseInt(fpsAssign[1], 10);
            else if (fpsProp) varMap['fps'] = parseInt(fpsProp[1], 10);
            else varMap['fps'] = defaultFps;

            // Collect all variable declarations
            const declarations: Array<{ name: string; expr: string }> = [];
            const declRegex = /(?:const|let|var)\s+(\w+)\s*=\s*([^;\n]+)/g;
            let m: RegExpExecArray | null;
            while ((m = declRegex.exec(src)) !== null) {
                declarations.push({ name: m[1], expr: m[2].trim() });
            }

            // Iteratively resolve using variable substitution + safe evaluation
            for (let pass = 0; pass < 5; pass++) {
                for (const { name, expr } of declarations) {
                    if (varMap[name] !== undefined) continue;
                    let resolved = expr;
                    for (const [k, v] of Object.entries(varMap)) {
                        resolved = resolved.replace(new RegExp(`\\b${k}\\b`, 'g'), String(v));
                    }
                    // Strip Math.x identifiers for safety check, then evaluate with Math in scope
                    const sanitized = resolved.replace(/\bMath\.(ceil|floor|round|abs|min|max)\b/g, '');
                    if (/^[\d\s\+\-\*\/\.\(\),]+$/.test(sanitized)) {
                        try {
                            // eslint-disable-next-line no-new-func
                            const val = new Function('Math', `"use strict"; return (${resolved})`)(Math) as number;
                            if (typeof val === 'number' && isFinite(val) && val > 0) {
                                varMap[name] = Math.round(val);
                            }
                        } catch { /* skip */ }
                    }
                }
            }

            const fps = varMap['fps'] ?? defaultFps;
            // Use resolved durationInFrames → else durationInSeconds * fps → else prop
            let duration = defaultDuration;
            if (varMap['durationInFrames'] && varMap['durationInFrames'] > 0) {
                duration = varMap['durationInFrames'];
            } else if (varMap['durationInSeconds'] && varMap['durationInSeconds'] > 0) {
                duration = Math.round(varMap['durationInSeconds'] * fps);
            }

            return { fps, duration };
        },
        [defaultFps, defaultDuration]
    );

    // ============================================================
    // STEPS 1-4, 6 — Main compilation & lifecycle orchestrator
    // ============================================================
    useEffect(() => {
        // STEP 6: If editor is empty, destroy preview entirely
        if (!isValid || !code.trim()) {
            setPreview({ Component: null, instanceKey: "", fps: defaultFps, duration: defaultDuration });
            setStatus("idle");
            setError(null);
            return;
        }

        let cancelled = false;

        // STEP 1: Increment instance counter immediately to force future remount
        previewInstanceRef.current++;
        const thisInstance = previewInstanceRef.current;

        // STEP 6: Destroy previous player immediately
        setPreview({ Component: null, instanceKey: "", fps: defaultFps, duration: defaultDuration });
        setStatus("compiling");
        setError(null);

        const compile = async () => {
            try {
                // STEP 9: Ensure fonts are ready before compiling
                await loadPremiumFonts();

                if (cancelled) return;

                // Parse composition settings before compilation
                const config = parseCompositionConfig(code);

                // STEP 3: Strip imports — fresh scope every time (no caching)
                let processedCode = code.replace(
                    /import\s+[\s\S]*?from\s+['"].*?['"];?/g,
                    ""
                );

                // Handle all export patterns
                // Pattern: `export default function ComponentName`
                if (/export\s+default\s+function\s+(\w+)/.test(processedCode)) {
                    processedCode = processedCode.replace(
                        /export\s+default\s+function\s+(\w+)/,
                        "function $1"
                    );
                    const fnName = processedCode.match(/function\s+(\w+)/)?.[1];
                    processedCode += `\n__EXPORTED__ = ${fnName};`;
                }
                // Pattern: `export default ComponentName;` (named reference)
                else if (/export\s+default\s+(\w+)\s*;/.test(processedCode)) {
                    const name = processedCode.match(/export\s+default\s+(\w+)\s*;/)?.[1];
                    processedCode = processedCode.replace(
                        /export\s+default\s+(\w+)\s*;/,
                        `__EXPORTED__ = ${name};`
                    );
                }
                // Pattern: `export default () => { ... }`
                else if (/export\s+default/.test(processedCode)) {
                    processedCode = processedCode.replace(
                        /export\s+default/,
                        "__EXPORTED__ ="
                    );
                }

                // Remove remaining named exports
                processedCode = processedCode.replace(/export\s+(?:const|let|var|function)/g, (match) => {
                    return match.replace("export ", "");
                });

                // STEP 3: Compile with Babel — generate completely new module
                const compiled = Babel.transform(processedCode, {
                    presets: ["react", "typescript"],
                    filename: "UserComp.tsx",
                }).code;

                if (!compiled) throw new Error("Babel compilation returned empty result");

                // STEP 3: Evaluate in isolated scope — no shared closure state
                const factory = new Function(
                    "React",
                    "Remotion",
                    `
          var __EXPORTED__ = null;
          
          // Unpack Remotion into the scope
          var AbsoluteFill = Remotion.AbsoluteFill;
          var Sequence = Remotion.Sequence;
          var Loop = Remotion.Loop;
          var random = Remotion.random;
          var interpolate = Remotion.interpolate;
          var spring = Remotion.spring;
          var Easing = Remotion.Easing;
          var continueRender = Remotion.continueRender;
          var delayRender = Remotion.delayRender;
          var staticFile = Remotion.staticFile;
          var useCurrentFrame = Remotion.useCurrentFrame;
          var useVideoConfig = Remotion.useVideoConfig;
          var Img = Remotion.Img;
          var Audio = Remotion.Audio;
          var Video = Remotion.Video;
          var OffthreadVideo = Remotion.OffthreadVideo;
          
          // Unpack React into the scope
          var useState = React.useState;
          var useEffect = React.useEffect;
          var useMemo = React.useMemo;
          var useRef = React.useRef;
          var useCallback = React.useCallback;
          
          ${compiled}
          
          return __EXPORTED__;
          `
                );

                const UserComponent = factory(React, Remotion);

                if (!UserComponent) {
                    throw new Error(
                        "No exported component found. Ensure your code has 'export default'."
                    );
                }

                if (cancelled) return;

                // STEP 4: Do NOT wrap user component in extra containers.
                // Render EXACTLY the pasted component without modification.

                // STEP 1: Generate unique instance key (hash + counter + timestamp)
                const instanceKey = `${hashCode(code)}-${thisInstance}-${Date.now()}`;

                setPreview({
                    Component: UserComponent,
                    instanceKey,
                    fps: config.fps,
                    duration: config.duration,
                });
                setError(null);
                setStatus("ready");

                // STEP 2: Reset frame to 0 after mount
                requestAnimationFrame(() => {
                    playerRef.current?.seekTo(0);
                });
            } catch (err: any) {
                if (cancelled) return;
                setError(err.message || "Compilation failed");
                setStatus("error");
            }
        };

        // Debounce compilation by 150ms for performance (STEP 16)
        const timer = setTimeout(compile, 150);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [code, isValid, parseCompositionConfig, defaultFps, defaultDuration]);

    const handleRenderError = useCallback((err: Error) => {
        setError(err.message);
        setStatus("error");
    }, []);

    // ============================================================
    // STEP 14 — Debug mode state
    // ============================================================
    const [currentFrame, setCurrentFrame] = useState(0);
    const [debugVisible, setDebugVisible] = useState(false);

    // Toggle debug with Ctrl+Shift+D
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.shiftKey && e.key === "D") {
                e.preventDefault();
                setDebugVisible((v) => !v);
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, []);

    // ============================================================
    // Error state
    // ============================================================
    if (error) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-black text-red-500 font-mono text-xs overflow-auto">
                <AlertCircle className="w-8 h-8 mb-4 opacity-50" />
                <div className="max-w-md text-center">
                    <p className="font-bold mb-2 uppercase tracking-widest text-[10px]">
                        Preview Component Failure
                    </p>
                    <p className="opacity-80 italic">{error}</p>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setError(null); setStatus("idle"); }}
                        className="mt-4 text-[8px] uppercase tracking-widest hover:bg-white/5 border border-white/10"
                    >
                        Retry Preview
                    </Button>
                </div>
            </div>
        );
    }

    // ============================================================
    // Loading state
    // ============================================================
    if (!fontsReady || status === "compiling") {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center bg-black text-primary/50">
                <Loader2 className="w-8 h-8 animate-spin mb-4" />
                <span className="text-xs uppercase font-bold tracking-widest">
                    {!fontsReady ? "Loading Fonts..." : "Compiling TSX..."}
                </span>
            </div>
        );
    }

    // ============================================================
    // Idle state (no code validated yet)
    // ============================================================
    if (status === "idle" || !preview.Component) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center bg-black text-white/20">
                <span className="text-xs uppercase font-bold tracking-widest">
                    Paste TSX code and click "Run Preview"
                </span>
            </div>
        );
    }

    // ============================================================
    // STEP 5, 7, 8, 10, 14, 15 — Render the Player
    // ============================================================
    return (
        <div
            className="w-full h-full relative group bg-black"
            style={{
                display: "flex",
                flexDirection: "column",
                ...FONT_SMOOTHING_STYLE,
            }}
        >
            {/* STEP 14 — Debug overlay (toggle with Ctrl+Shift+D or hover) */}
            <div
                className="absolute top-2 left-2 z-50 bg-black/80 backdrop-blur-md border border-white/10 rounded-md p-2 text-[10px] font-mono text-white/70 transition-opacity"
                style={{ opacity: debugVisible ? 1 : 0, pointerEvents: debugVisible ? "auto" : "none" }}
            >
                <div className="flex flex-col gap-1">
                    <span className="text-primary font-bold tracking-widest uppercase mb-1">
                        Preview Engine v2
                    </span>
                    <span>
                        Status: <span className="text-green-400">{status}</span>
                    </span>
                    <span>
                        Frame:{" "}
                        <span className="text-white">{currentFrame}</span> /{" "}
                        {preview.duration}
                    </span>
                    <span>
                        FPS: <span className="text-white">{preview.fps}</span>
                    </span>
                    <span>
                        Duration:{" "}
                        <span className="text-white">
                            {(preview.duration / preview.fps).toFixed(2)}s
                        </span>
                    </span>
                    <span>
                        Fonts:{" "}
                        <span className="text-green-400">Loaded</span>
                    </span>
                    <span>
                        Instance:{" "}
                        <span className="text-white/40">
                            {preview.instanceKey.substring(0, 12)}
                        </span>
                    </span>
                </div>
            </div>

            {/* STEP 5, 1 — The Remotion Player with forced remount via key */}
            <div
                className="flex-1 flex items-center justify-center relative overflow-hidden"
                style={{ minHeight: 0 }}
            >
                <ErrorBoundary
                    onError={handleRenderError}
                    key={preview.instanceKey}
                >
                    <Player
                        ref={playerRef}
                        component={preview.Component}
                        durationInFrames={preview.duration}
                        compositionWidth={width}
                        compositionHeight={height}
                        fps={preview.fps}
                        controls
                        autoPlay
                        loop
                        style={{ width: "100%", height: "100%" }}
                        spaceKeyToPlayOrPause
                        clickToPlay
                    />
                </ErrorBoundary>
            </div>

            <FrameTracker playerRef={playerRef} onFrameChange={setCurrentFrame} />
        </div>
    );
}

// ============================================================
// Frame observer — lightweight, no heavy re-renders
// ============================================================
function FrameTracker({
    playerRef,
    onFrameChange,
}: {
    playerRef: React.RefObject<PlayerRef | null>;
    onFrameChange: (f: number) => void;
}) {
    useEffect(() => {
        let raf: number;
        const tick = () => {
            if (playerRef.current) {
                onFrameChange(playerRef.current.getCurrentFrame());
            }
            raf = requestAnimationFrame(tick);
        };
        tick();
        return () => cancelAnimationFrame(raf);
    }, [playerRef, onFrameChange]);

    return null;
}
