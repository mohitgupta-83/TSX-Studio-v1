"use client";

import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Editor } from "@monaco-editor/react";
import {
    Play,
    Save,
    Code2,
    CheckCircle2,
    AlertCircle,
    Copy,
    Plus,
    Wand2,
    MonitorPlay,
    ExternalLink,
    ChevronLeft,
    Loader2,
    Upload,
    RotateCcw,
    Eye,
    Smartphone,
    Monitor,
    Square,
    Sparkles,
    Shield,
    Mic
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";

import { ExportDialog } from "./export-dialog";
import { cn } from "@/lib/utils";
import { CLAUDE_PRESETS, getClaudePrompt } from "@/lib/claudePresets";
import { SAMPLE_TSX } from "@/lib/sampleTsx";
import { validateTsxCode, ValidationError } from "@/lib/tsxValidator";
import { LivePreview } from "./live-preview";

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface Version {
    id: string;
    versionNumber: number;
    title: string | null;
    validated?: boolean;
    code?: string;
    createdAt: string;
}

interface StudioClientProps {
    projectId: string;
    projectName?: string;
    projectStatus?: string;
    initialCode?: string;
    versions?: Version[];
    resolution?: string;
    fps?: number;
    isDemo?: boolean;
    isReadOnly?: boolean;
    isLoggedIn?: boolean;
    userPlan?: string;
}

const DEFAULT_CODE = `import { AbsoluteFill, useCurrentFrame, interpolate, spring } from 'remotion';
import React from 'react';

export const fps = 30;
export const durationInFrames = 10 * fps;

const easeOutExpo = (x: number) =>
  x >= 1 ? 1 : 1 - Math.pow(2, -10 * Math.max(0, x));

const easeOutCubic = (x: number) =>
  1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);

const easeInOutQuart = (x: number) => {
  const v = Math.min(1, Math.max(0, x));
  return v < 0.5 ? 8 * v * v * v * v : 1 - Math.pow(-2 * v + 2, 4) / 2;
};

const easeOutBack = (x: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const v = Math.min(1, Math.max(0, x));
  return 1 + c3 * Math.pow(v - 1, 3) + c1 * Math.pow(v - 1, 2);
};

const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };

const accent = '#818cf8';
const accentB = '#6366f1';
const accentGold = '#d4a96a';

const PARTICLE_COUNT = 28;
const particles = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
  id: i,
  x: 4 + ((i * 139.5) % 92),
  y: 4 + ((i * 92.3) % 92),
  size: 1.2 + (i % 5) * 1.05,
  speed: 0.07 + (i % 7) * 0.044,
  phase: (i * 0.72) % (Math.PI * 2),
  opacity: 0.026 + (i % 5) * 0.023,
  accent: i % 4 === 0,
}));

export default function CinematicReveal() {
  const frame = useCurrentFrame();
  const t = frame / fps;
  const total = durationInFrames;

  const cameraScale = interpolate(frame, [0, total], [1.0, 1.07], clamp);
  const softPulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 0.5);

  const orbX1 = 28 + Math.sin(t * 0.2) * 9;
  const orbY1 = 32 + Math.cos(t * 0.14) * 7;
  const orbX2 = 72 + Math.cos(t * 0.18) * 8;
  const orbY2 = 68 + Math.sin(t * 0.24) * 6;
  const lensOpacity = 0.04 + 0.025 * Math.sin(t * Math.PI * 0.5);

  // Light sweep beam
  const beamX = interpolate(frame, [0, total], [-30, 130], clamp);
  const beamOpacity = interpolate(frame, [0, 20, 80, total], [0, 0.07, 0.04, 0.02], clamp);

  // -- EYEBROW --
  const eyebrowSf = 8;
  const eyebrowSpring = spring({
    frame: Math.max(0, frame - eyebrowSf),
    fps,
    config: { damping: 22, stiffness: 180, mass: 0.72 },
    from: 0, to: 1,
  });
  const eyebrowOpacity = interpolate(frame, [eyebrowSf, eyebrowSf + 16], [0, 1], clamp);
  const eyebrowY = interpolate(eyebrowSpring, [0, 1], [28, 0], clamp);
  const eyebrowBlur = interpolate(frame, [eyebrowSf, eyebrowSf + 18], [8, 0], clamp);

  // -- INTRODUCING line --
  const introSf = 16;
  const introSpring = spring({
    frame: Math.max(0, frame - introSf),
    fps,
    config: { damping: 28, stiffness: 140, mass: 1.0 },
    from: 0, to: 1,
  });
  const introOpacity = interpolate(frame, [introSf, introSf + 18], [0, 1], clamp);
  const introY = interpolate(introSpring, [0, 1], [90, 0], clamp);
  const introBlur = interpolate(frame, [introSf, introSf + 24], [14, 0], clamp);
  const introScale = interpolate(introSpring, [0, 1], [0.91, 1.0], clamp);
  const introLetterSpacing = interpolate(introSpring, [0, 1], [6, -1], clamp);

  // -- TSX STUDIO (hero) --
  const heroSf = 28;
  const heroSpring = spring({
    frame: Math.max(0, frame - heroSf),
    fps,
    config: { damping: 24, stiffness: 130, mass: 1.12 },
    from: 0, to: 1,
  });
  const heroOpacity = interpolate(frame, [heroSf, heroSf + 20], [0, 1], clamp);
  const heroY = interpolate(heroSpring, [0, 1], [110, 0], clamp);
  const heroBlur = interpolate(frame, [heroSf, heroSf + 28], [18, 0], clamp);
  const heroScale = interpolate(heroSpring, [0, 1], [0.88, 1.0], clamp);
  const heroLetterSpacing = interpolate(heroSpring, [0, 1], [10, -5], clamp);
  const heroGlowRadius = interpolate(frame, [heroSf, heroSf + 60], [0, 80], clamp);

  const heroIdle = frame > heroSf + 40
    ? 1 + 0.003 * Math.sin((t - (heroSf + 40) / fps) * Math.PI * 0.7)
    : heroScale;

  // -- RULE LINE --
  const ruleSf = heroSf + 18;
  const ruleWidth = interpolate(frame, [ruleSf, ruleSf + 30], [0, 260], { ...clamp, easing: easeOutExpo });

  // -- SUBTITLE --
  const subtitleSf = heroSf + 22;
  const subtitleSpring = spring({
    frame: Math.max(0, frame - subtitleSf),
    fps,
    config: { damping: 26, stiffness: 150, mass: 0.90 },
    from: 0, to: 1,
  });
  const subtitleOpacity = interpolate(frame, [subtitleSf, subtitleSf + 18], [0, 1], clamp);
  const subtitleY = interpolate(subtitleSpring, [0, 1], [50, 0], clamp);
  const subtitleBlur = interpolate(frame, [subtitleSf, subtitleSf + 20], [8, 0], clamp);

  // -- BOTTOM BADGE --
  const badgeSf = subtitleSf + 24;
  const badgeOpacity = interpolate(frame, [badgeSf, badgeSf + 20], [0, 1], clamp);
  const badgeY = interpolate(
    spring({ frame: Math.max(0, frame - badgeSf), fps, config: { damping: 24, stiffness: 160, mass: 0.85 }, from: 0, to: 1 }),
    [0, 1], [30, 0], clamp
  );

  return (
    <AbsoluteFill style={{
      width: 1080,
      height: 1920,
      overflow: 'hidden',
      fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
    }}>

      {/* -- BACKGROUND SYSTEM -- */}
      <div style={{
        position: 'absolute', inset: 0,
        transform: \`scale(\${cameraScale})\`,
        transformOrigin: '50% 50%',
        willChange: 'transform',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(168deg, #06050f 0%, #0a0814 45%, #050409 80%, #080510 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: \`radial-gradient(ellipse at \${orbX1}% \${orbY1}%, rgba(129,140,248,0.13) 0%, transparent 52%)\` }} />
        <div style={{ position: 'absolute', inset: 0, background: \`radial-gradient(ellipse at \${orbX2}% \${orbY2}%, rgba(99,102,241,0.07) 0%, transparent 46%)\` }} />
        <div style={{ position: 'absolute', inset: 0, background: \`radial-gradient(ellipse at 50% 48%, rgba(212,169,106,0.06) 0%, transparent 48%)\`, opacity: lensOpacity * 14 }} />
        <div style={{ position: 'absolute', inset: 0, background: \`linear-gradient(105deg, transparent \${beamX - 12}%, rgba(255,255,255,\${beamOpacity}) \${beamX}%, transparent \${beamX + 12}%)\` }} />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 50%, transparent 22%, rgba(0,0,0,0.86) 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, opacity: 0.027, backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\\"0 0 512 512\\" xmlns=\\"http://www.w3.org/2000/svg\\"%3E%3Cfilter id=\\"n\\"%3E%3CfeTurbulence type=\\"fractalNoise\\" baseFrequency=\\"0.74\\" numOctaves=\\"4\\" stitchTiles=\\"stitch\\"/%3E%3C/filter%3E%3Crect width=\\"100%25\\" height=\\"100%25\\" filter=\\"url(%23n)\\"/%3E%3C/svg%3E")', backgroundSize: '256px 256px' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.014) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.014) 1px, transparent 1px)', backgroundSize: '88px 88px' }} />
      </div>

      {/* -- PARTICLES -- */}
      {particles.map(p => {
        const px = Math.cos(t * p.speed * Math.PI * 1.4 + p.phase) * 11;
        const py = Math.sin(t * p.speed * Math.PI * 2.0 + p.phase) * 22;
        const po = p.opacity * (0.5 + 0.5 * Math.sin(t * p.speed * Math.PI * 3 + p.phase));
        const fadeIn = interpolate(frame, [0, 22], [0, 1], clamp);
        return (
          <div key={p.id} style={{
            position: 'absolute', left: \`\${p.x}%\`, top: \`\${p.y}%\`, width: p.size, height: p.size, borderRadius: '50%',
            background: p.accent ? accent : '#ffffff', opacity: po * fadeIn,
            transform: \`translate(\${px}px, \${py}px)\`,
            willChange: 'transform',
            boxShadow: p.accent ? \`0 0 \${6 + softPulse * 4}px \${accent}88\` : 'none',
          }} />
        );
      })}

      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -58%)', width: 800, height: 500,
        background: \`radial-gradient(ellipse at 50% 50%, \${accent}\${Math.floor(heroOpacity * 18).toString(16).padStart(2, '0')} 0%, transparent 65%)\`,
        opacity: interpolate(frame, [heroSf, heroSf + 50], [0, 1], clamp),
        filter: \`blur(\${60 - heroOpacity * 20}px)\`,
        pointerEvents: 'none',
      }} />

      <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifySelf: 'center', padding: '0 80px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40, opacity: eyebrowOpacity, transform: \`translateY(\${eyebrowY}px)\`, filter: \`blur(\${eyebrowBlur}px)\`, willChange: 'transform' }}>
          <div style={{ width: interpolate(frame, [eyebrowSf + 4, eyebrowSf + 22], [0, 32], { ...clamp, easing: easeOutExpo }), height: 1, background: \`linear-gradient(90deg, transparent, \${accent}88)\` }} />
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: accent, boxShadow: \`0 0 \${10 + softPulse * 8}px \${accent}, 0 0 \${20 + softPulse * 12}px \${accent}55\` }} />
          <span style={{ fontSize: 21, fontWeight: 600, letterSpacing: '0.30em', color: \`\${accent}88\`, textTransform: 'uppercase' }}>Now Available</span>
          <div style={{ width: interpolate(frame, [eyebrowSf + 4, eyebrowSf + 22], [0, 32], { ...clamp, easing: easeOutExpo }), height: 1, background: \`linear-gradient(90deg, \${accent}88, transparent)\` }} />
        </div>

        <div style={{ overflow: 'hidden', marginBottom: 6 }}>
          <div style={{ opacity: introOpacity, transform: \`translateY(\${introY}px) scale(\${introScale})\`, filter: \`blur(\${introBlur}px)\`, willChange: 'transform' }}>
            <div style={{ fontSize: 72, fontWeight: 300, fontStyle: 'italic', color: 'rgba(255,255,255,0.55)', textAlign: 'center', letterSpacing: \`\${introLetterSpacing}px\`, lineHeight: 1.1 }}>Introducing</div>
          </div>
        </div>

        <div style={{ overflow: 'hidden', marginBottom: 4 }}>
          <div style={{ opacity: heroOpacity, transform: \`translateY(\${heroY}px) scale(\${frame > heroSf + 40 ? heroIdle : heroScale})\`, filter: \`blur(\${heroBlur}px)\`, willChange: 'transform' }}>
            <div style={{ fontSize: 148, fontWeight: 900, color: '#ffffff', textAlign: 'center', letterSpacing: \`\${heroLetterSpacing}px\`, lineHeight: 0.95, textShadow: \`0 0 \${heroGlowRadius}px \${accent}44, 0 0 \${heroGlowRadius * 1.6}px \${accent}22, 0 2px 0 rgba(0,0,0,0.5)\` }}>TSX</div>
          </div>
        </div>

        <div style={{ overflow: 'hidden', marginBottom: 48 }}>
          <div style={{ opacity: interpolate(frame, [heroSf + 6, heroSf + 26], [0, 1], clamp), transform: \`translateY(\${interpolate(spring({ frame: Math.max(0, frame - heroSf - 6), fps, config: { damping: 24, stiffness: 130, mass: 1.12 }, from: 0, to: 1 }), [0, 1], [90, 0], clamp)}px) scale(\${frame > heroSf + 40 ? heroIdle : heroScale})\`, filter: \`blur(\${interpolate(frame, [heroSf + 6, heroSf + 32], [14, 0], clamp)}px)\`, willChange: 'transform' }}>
            <div style={{ fontSize: 148, fontWeight: 900, color: 'transparent', backgroundImage: \`linear-gradient(135deg, \${accent} 0%, #c7d2fe 38%, \${accentB} 65%, \${accentGold} 100%)\`, backgroundClip: 'text', WebkitBackgroundClip: 'text', textAlign: 'center', letterSpacing: \`\${interpolate(spring({ frame: Math.max(0, frame - heroSf - 6), fps, config: { damping: 24, stiffness: 130, mass: 1.12 }, from: 0, to: 1 }), [0, 1], [10, -5], clamp)}px\`, lineHeight: 0.95, textShadow: 'none', filter: \`drop-shadow(0 0 \${30 + softPulse * 20}px \${accent}55)\` }}>Studio</div>
          </div>
        </div>

        <div style={{ width: ruleWidth, height: 2, borderRadius: 2, background: \`linear-gradient(90deg, transparent, \${accent}, \${accentGold}88, \${accentB}88, transparent)\`, boxShadow: \`0 0 14px \${accent}55, 0 0 28px \${accent}22\`, marginBottom: 44, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, bottom: 0, width: '28%', left: \`\${(Math.sin(t * 2.4) * 0.5 + 0.5) * 66}%\`, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.65), transparent)', opacity: 0.5 }} />
        </div>

        <div style={{ overflow: 'hidden', marginBottom: 72 }}>
          <div style={{ opacity: subtitleOpacity, transform: \`translateY(\${subtitleY}px)\`, filter: \`blur(\${subtitleBlur}px)\`, willChange: 'transform' }}>
            <div style={{ fontSize: 42, fontWeight: 400, color: 'rgba(255,255,255,0.48)', textAlign: 'center', letterSpacing: '0.01em', lineHeight: 1.5 }}>Create motion graphics with code</div>
          </div>
        </div>

        <div style={{ opacity: badgeOpacity, transform: \`translateY(\${badgeY}px)\`, willChange: 'transform' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, background: 'linear-gradient(138deg, rgba(255,255,255,0.062) 0%, rgba(255,255,255,0.018) 100%)', border: \`1px solid \${accent}33\`, borderRadius: 100, padding: '18px 48px', backdropFilter: 'blur(20px)', boxShadow: \`0 0 0 1px rgba(255,255,255,0.04), 0 20px 48px rgba(0,0,0,0.4), 0 0 \${24 + softPulse * 14}px \${accent}22\`, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: 1, background: \`linear-gradient(90deg, transparent, \${accent}44, transparent)\` }} />
            <div style={{ width: 9, height: 9, borderRadius: '50%', background: accentGold, boxShadow: \`0 0 \${8 + softPulse * 8}px \${accentGold}, 0 0 20px \${accentGold}66\` }} />
            <span style={{ fontSize: 24, fontWeight: 500, color: 'rgba(255,255,255,0.60)', letterSpacing: '0.08em' }}>React · Remotion · TypeScript</span>
            <div style={{ width: 9, height: 9, borderRadius: '50%', background: accent, boxShadow: \`0 0 \${8 + softPulse * 8}px \${accent}\` }} />
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}`;

export function StudioClient({
    projectId,
    projectName = "Untitled Project",
    projectStatus = "Draft",
    initialCode,
    versions = [],
    resolution: initialResolution = "1080p",
    fps = 30,
    isDemo = false,
    isReadOnly = false,
    isLoggedIn = false,
    userPlan = "FREE"
}: StudioClientProps) {
    const router = useRouter();
    const [code, setCode] = useState(initialCode || DEFAULT_CODE);
    const [originalCode, setOriginalCode] = useState(initialCode || DEFAULT_CODE);
    const [activeVersionId, setActiveVersionId] = useState(versions[0]?.id || "");
    const [localVersions, setLocalVersions] = useState(versions);

    // Parse dimensions directly from code.
    const parseDimensions = (sourceCode: string) => {
        const fps = 30; // Fixed output FPS
        const varMap: Record<string, number> = { fps };
        const declarations: Array<{ name: string; expr: string }> = [];
        const declRegex = /(?:const|let|var)\s+(\w+)\s*=\s*([^;\n]+)/g;
        let m: RegExpExecArray | null;
        while ((m = declRegex.exec(sourceCode)) !== null) {
            declarations.push({ name: m[1], expr: m[2].trim() });
        }
        for (let pass = 0; pass < 5; pass++) {
            for (const { name, expr } of declarations) {
                if (varMap[name] !== undefined) continue;
                let resolved = expr;
                for (const [k, v] of Object.entries(varMap)) {
                    resolved = resolved.replace(new RegExp('\\b' + k + '\\b', 'g'), String(v));
                }
                const sanitized = resolved.replace(/\bMath\.(ceil|floor|round|abs|min|max)\b/g, '');
                if (/^[\d\s\+\-\*\/\.\(\),]+$/.test(sanitized)) {
                    try {
                        const val = new Function('Math', '"use strict"; return (' + resolved + ')')(Math) as number;
                        if (typeof val === 'number' && isFinite(val) && val > 0) {
                            varMap[name] = Math.round(val);
                        }
                    } catch { }
                }
            }
        }
        let durationInFrames = 300;
        if (varMap['durationInFrames'] && varMap['durationInFrames'] > 0) {
            durationInFrames = varMap['durationInFrames'];
        } else if (varMap['durationInSeconds'] && varMap['durationInSeconds'] > 0) {
            durationInFrames = Math.round(varMap['durationInSeconds'] * fps);
        }
        return { width: 1080, height: 1920, fps, durationInFrames };
    };

    const [dimensions, setDimensions] = useState(parseDimensions(code));
    useEffect(() => { setDimensions(parseDimensions(code)); }, [code]);

    const [activeTab, setActiveTab] = useState("editor");
    const [isValidating, setIsValidating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [validationResult, setValidationResult] = useState<{ valid: boolean; errors: ValidationError[] } | null>(null);
    const [activePresetId, setActivePresetId] = useState(CLAUDE_PRESETS[0].id);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleCodeChange = (value: string | undefined) => {
        const newCode = value || "";
        setCode(newCode);
        setHasUnsavedChanges(newCode !== originalCode);
    };

    const [validatedCode, setValidatedCode] = useState(code);

    const validateCode = useCallback(() => {
        setIsValidating(true);
        setValidationResult(null);
        setTimeout(() => {
            const res = validateTsxCode(code);
            setValidationResult({ valid: res.ok, errors: res.errors });
            setIsValidating(false);
            if (res.ok) {
                setValidatedCode(code);
                toast.success("Validation passed!", { description: "Ready for export node cluster." });
            } else {
                toast.error("Code rejected by compiler", {
                    description: res.errors.filter(e => e.severity === 'error').length + " high-priority issue(s) detected."
                });
            }
        }, 800);
    }, [code]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch(`/api/versions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ projectId, code, title: `Version ${localVersions.length + 1}` }),
            });
            if (res.ok) {
                const newVersion = await res.json();
                newVersion.code = code;
                setLocalVersions(prev => [newVersion, ...prev]);
                setActiveVersionId(newVersion.id);
                setOriginalCode(code);
                setHasUnsavedChanges(false);
                toast.success("New version saved!");
            } else { toast.error("Failed to save version"); }
        } catch (error) { toast.error("Error saving version"); }
        setIsSaving(false);
    };

    const handleFormat = () => toast.success("Code formatted!");
    const copyCode = () => { navigator.clipboard.writeText(code); toast.success("Code copied!"); };
    const handleReset = () => { if (confirm("Discard changes?")) setCode(originalCode); };
    const handleLoadSample = () => {
        setCode(SAMPLE_TSX);
        setHasUnsavedChanges(true);
        toast.success("Sample project injected!");
        setActiveTab("editor");
    };

    const handleCopyClaudePrompt = () => {
        const prompt = getClaudePrompt(activePresetId, "", dimensions.durationInFrames / dimensions.fps);
        navigator.clipboard.writeText(prompt);
        toast.success("Claude prompt copied ✅");
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            setCode(content);
            setHasUnsavedChanges(true);
            toast.success(`Loaded: ${file.name}`);
            setTimeout(() => { setActiveTab("editor"); }, 100);
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-[#0A0A0B]">
            <header className="h-14 border-b border-white/5 flex items-center justify-between px-4 bg-[#0A0A0B]">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard"><Button variant="ghost" size="icon"><ChevronLeft className="w-4 h-4" /></Button></Link>
                    <div className="flex items-center gap-2"><h2 className="font-bold text-sm">Project: {projectName}</h2></div>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] font-mono border-white/10 bg-white/5 h-8">
                        {dimensions.width}x{dimensions.height} @ {dimensions.fps}FPS
                    </Badge>
                    <Badge variant="outline" className="text-[10px] font-mono border-primary/30 bg-primary/5 text-primary h-8">
                        {Math.round(dimensions.durationInFrames / dimensions.fps)}s ({dimensions.durationInFrames} frames)
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={handleFormat}><Wand2 className="w-3.5 h-3.5 mr-2" /> Format</Button>
                    {!isReadOnly && (
                        <Button variant="ghost" size="sm" onClick={handleLoadSample} className="text-primary hover:text-primary hover:bg-primary/10">
                            <Sparkles className="w-3.5 h-3.5 mr-2" /> Try Sample
                        </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={validateCode} disabled={isValidating}>
                        {isValidating ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <Play className="w-3.5 h-3.5 mr-2" />} Run Preview
                    </Button>
                    {!isReadOnly && (
                        <Button size="sm" onClick={handleSave} disabled={isSaving || !hasUnsavedChanges}>
                            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        </Button>
                    )}
                    <ExportDialog
                        projectId={projectId} versionId={activeVersionId} code={code} disabled={isDemo}
                        isLoggedIn={isLoggedIn} width={dimensions.width} height={dimensions.height}
                        fps={dimensions.fps} durationInFrames={dimensions.durationInFrames}
                    />
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                <div className="w-64 border-r border-white/5 flex flex-col bg-[#0A0A0B]">
                    <div className="p-4 border-b border-white/5 bg-[#0A0A0B]">
                        <h3 className="text-[10px] font-bold text-muted-foreground mb-4 uppercase tracking-wider">Versions History</h3>
                    </div>
                    <ScrollArea className="flex-1">
                        <div className="p-2 space-y-2">
                            {isReadOnly && (
                                <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 mb-4">
                                    <p className="text-[10px] font-black uppercase text-primary mb-1">Demo Mode</p>
                                    <p className="text-[10px] text-muted-foreground leading-tight italic">Read-only view. Sign up to save projects.</p>
                                </div>
                            )}
                            {localVersions.map(v => (
                                <div key={v.id} onClick={() => { setCode(v.code || DEFAULT_CODE); setActiveVersionId(v.id); }}
                                    className={cn("p-3 rounded-lg border transition-all cursor-pointer", v.id === activeVersionId ? "border-primary/30 bg-primary/5" : "border-white/5 hover:bg-white/5")}>
                                    <div className="flex justify-between items-center mb-1">
                                        <div className={cn("text-[10px] font-bold uppercase", v.id === activeVersionId ? "text-primary" : "text-muted-foreground")}>v{v.versionNumber}</div>
                                        <div className="text-[10px] text-muted-foreground opacity-50">{formatDistanceToNow(new Date(v.createdAt))}</div>
                                    </div>
                                    <div className="text-xs font-medium truncate opacity-80">{v.title}</div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </div>

                <div className="flex-1 bg-black/50 p-6 flex flex-col relative overflow-hidden">
                    <div className="flex-1 rounded-2xl border border-white/10 bg-[#111112] shadow-2xl relative flex items-center justify-center overflow-hidden">
                        {isValidating ? (
                            <div className="text-center text-primary animate-pulse">
                                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                                <span className="text-sm font-medium">Building...</span>
                            </div>
                        ) : (validationResult?.valid) ? (
                            <div className="w-full h-full relative group bg-black flex items-center justify-center p-4">
                                <div className="relative bg-black rounded-lg overflow-hidden shadow-2xl ring-1 ring-white/10"
                                     style={{ aspectRatio: dimensions.width + " / " + dimensions.height, maxWidth: '100%', maxHeight: '100%', width: dimensions.width > dimensions.height ? '100%' : 'auto', height: dimensions.height >= dimensions.width ? '100%' : 'auto' }}>
                                    <LivePreview key={dimensions.width + "-" + dimensions.height + "-" + dimensions.durationInFrames} code={validatedCode} isValid={true} width={1080} height={1920} fps={30} durationInFrames={dimensions.durationInFrames} />
                                </div>
                            </div>
                        ) : validationResult && !validationResult.valid ? (
                            <div className="w-full max-w-lg p-8 rounded-[40px] bg-destructive/5 border border-destructive/20 text-center space-y-6">
                                <AlertCircle className="w-10 h-10 text-destructive mx-auto" />
                                <h3 className="text-3xl font-black italic uppercase text-destructive">Preview Blocked</h3>
                                <p className="text-muted-foreground">{validationResult.errors[0]?.message}</p>
                                <Button variant="outline" onClick={() => setActiveTab("editor")} className="border-destructive/20 text-destructive">View Fix Log</Button>
                            </div>
                        ) : (
                            <div className="text-center text-muted-foreground flex flex-col items-center">
                                <Play className="w-12 h-12 mb-4 opacity-20" />
                                <span className="text-sm">Click "Run Preview" to start</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="w-[450px] border-l border-white/5 flex flex-col bg-[#0A0A0B] overflow-hidden">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                        <TabsList className="w-full justify-start rounded-none h-10 bg-transparent border-b border-white/5 px-4 pt-1">
                            <TabsTrigger value="editor" className="text-[10px] uppercase font-bold tracking-wider data-[state=active]:bg-white/5 gap-2"><Code2 className="w-3 h-3" /> Editor</TabsTrigger>
                            <TabsTrigger value="presets" className="text-[10px] uppercase font-bold tracking-wider data-[state=active]:bg-white/5 gap-2"><Sparkles className="w-3 h-3" /> Claude Presets</TabsTrigger>
                            {validationResult && !validationResult.valid && (
                                <TabsTrigger value="fixes" className="text-[10px] uppercase font-bold tracking-wider data-[state=active]:bg-red-500/10 text-red-500">Fixes ({validationResult.errors.length})</TabsTrigger>
                            )}
                            <TabsTrigger value="upload" className="text-[10px] uppercase font-bold tracking-wider data-[state=active]:bg-white/5">Upload</TabsTrigger>
                        </TabsList>
                        <TabsContent value="editor" className="flex-1 m-0 flex flex-col" forceMount style={{ display: activeTab === 'editor' ? 'flex' : 'none' }}>
                            <Editor
                                path="file:///main.tsx"
                                height="100%"
                                defaultLanguage="typescript"
                                theme="vs-dark"
                                value={code}
                                onChange={handleCodeChange}
                                options={{ minimap: { enabled: false }, fontSize: 13, automaticLayout: true, readOnly: isReadOnly }}
                            />
                        </TabsContent>
                        <TabsContent value="presets" className="flex-1 p-6 m-0 bg-[#0A0A0B]">
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <h4 className="text-[10px] font-black uppercase text-primary tracking-widest italic">Claude Caption Presets</h4>
                                    <p className="text-[10px] text-muted-foreground leading-relaxed italic italic">Optimized prompts for Claude generates.</p>
                                </div>
                                <div className="grid grid-cols-1 gap-2">
                                    {CLAUDE_PRESETS.map(preset => (
                                        <button key={preset.id} onClick={() => setActivePresetId(preset.id)}
                                            className={cn("p-4 rounded-2xl border text-left transition-all", activePresetId === preset.id ? "bg-primary/10 border-primary/30" : "bg-white/[0.02] border-white/5 hover:border-white/10")}>
                                            <p className="text-xs font-black italic uppercase tracking-tighter mb-1">{preset.name}</p>
                                            <p className="text-[10px] text-muted-foreground italic leading-tight">{preset.description}</p>
                                        </button>
                                    ))}
                                </div>
                                <Button onClick={handleCopyClaudePrompt} className="w-full h-12 rounded-xl font-black italic uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20">
                                    <Copy className="w-3 h-3 mr-2" /> Copy Prompt for Claude
                                </Button>
                            </div>
                        </TabsContent>
                        <TabsContent value="fixes" className="flex-1 m-0">
                            <ScrollArea className="h-full bg-red-500/[0.02]">
                                <div className="p-4 space-y-4">
                                    {validationResult?.errors.map((error, idx) => (
                                        <div key={idx} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2 group">
                                            <div className="flex items-center justify-between">
                                                <h5 className="text-xs font-black italic uppercase text-white">{error.title}</h5>
                                                <Badge className={cn("text-[8px] font-black uppercase px-2 py-0 h-4", error.severity === 'error' ? "bg-red-500/20 text-red-500" : "bg-yellow-500/20 text-yellow-500")}>{error.severity}</Badge>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground italic">{error.message}</p>
                                            {error.hint && (
                                                <div className="mt-2 p-3 rounded-xl bg-white/5 border border-white/5">
                                                    <p className="text-[9px] font-medium text-primary mb-1 italic">💡 Suggestion:</p>
                                                    <p className="text-[10px] font-mono text-muted-foreground/80">{error.hint}</p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}
