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

const DEFAULT_CODE = `import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';

export default function MyAnimation() {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 30], [0, 1]);
  
  return (
    <AbsoluteFill className="bg-slate-900 flex items-center justify-center">
      <h1 
        style={{ opacity }}
        className="text-6xl font-bold text-white tracking-tight"
      >
        TSX Studio Preview
      </h1>
      <p className="text-slate-400 mt-4">Frame: {frame}</p>
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

    // Parse dimensions directly from code
    // Uses top-level variable declaration matching to avoid false positives from CSS properties
    const parseDimensions = (sourceCode: string) => {
        // Match explicit variable declarations: `const fps = 30` or `export const fps = 30`
        const fpsAssign = sourceCode.match(/(?:const|let|var)\s+fps\s*=\s*(\d+)/);
        const parsedFps = fpsAssign ? parseInt(fpsAssign[1]) : 30;

        // Match duration patterns:
        // `const durationInFrames = 8 * fps` (multiplication)
        // `const durationInFrames = 240` (direct numeric)
        const durMath = sourceCode.match(/(?:const|let|var)\s+durationInFrames\s*=\s*(\d+)\s*\*\s*fps/);
        const durDirect = sourceCode.match(/(?:const|let|var)\s+durationInFrames\s*=\s*(\d+)(?!\s*\*)/);
        const durationSecondsMatch = sourceCode.match(/(?:const|let|var)\s+durationInSeconds\s*=\s*(\d+)/);

        // Match composition dimension declarations (not CSS properties)
        // `compositionWidth = 1080` or `const width = 1080`
        const widthDeclMatch = sourceCode.match(/(?:compositionWidth|const\s+width)\s*[:=]\s*(\d+)/);
        const heightDeclMatch = sourceCode.match(/(?:compositionHeight|const\s+height)\s*[:=]\s*(\d+)/);

        // Try to detect max duration from caption segments (end: XX.XX patterns)
        let maxEndTime = 0;
        const endTimeMatches = sourceCode.matchAll(/end:\s*(\d+\.?\d*)/g);
        for (const match of endTimeMatches) {
            const endTime = parseFloat(match[1]);
            if (endTime > maxEndTime) maxEndTime = endTime;
        }

        // Also check for totalDuration or similar patterns
        const totalDurationMatch = sourceCode.match(/totalDuration:\s*(\d+\.?\d*)/);
        if (totalDurationMatch) {
            const totalDur = parseFloat(totalDurationMatch[1]);
            if (totalDur > maxEndTime) maxEndTime = totalDur;
        }

        // Calculate durationInFrames with priority:
        // 1. Explicit durationInFrames with multiplication (e.g. 8 * fps)
        // 2. Explicit durationInFrames as direct number
        // 3. Explicit durationInSeconds
        // 4. Max end time from captions (+ 1 sec buffer)
        // 5. Default 300 frames (10 sec)
        let durationInFrames = 300;

        if (durMath) {
            durationInFrames = parseInt(durMath[1]) * parsedFps;
        } else if (durDirect) {
            durationInFrames = parseInt(durDirect[1]);
        } else if (durationSecondsMatch) {
            durationInFrames = parseInt(durationSecondsMatch[1]) * parsedFps;
        } else if (maxEndTime > 0) {
            durationInFrames = Math.ceil((maxEndTime + 1) * parsedFps);
        }

        return {
            width: 1080,
            height: 1920,
            fps: 30,
            durationInFrames
        };
    };

    const [dimensions, setDimensions] = useState(parseDimensions(code));

    useEffect(() => {
        setDimensions(parseDimensions(code));
    }, [code]);

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
                toast.success("Validation passed!", {
                    description: "Ready for export node cluster."
                });
            } else {
                toast.error("Code rejected by compiler", {
                    description: `${res.errors.filter(e => e.severity === 'error').length} high-priority issue(s) detected.`
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
                body: JSON.stringify({
                    projectId,
                    code,
                    title: `Version ${localVersions.length + 1}`,
                }),
            });

            if (res.ok) {
                const newVersion = await res.json();
                newVersion.code = code;
                setLocalVersions(prev => [newVersion, ...prev]);
                setActiveVersionId(newVersion.id);
                setOriginalCode(code);
                setHasUnsavedChanges(false);
                toast.success("New version saved!");
            } else {
                toast.error("Failed to save version");
            }
        } catch (error) {
            toast.error("Error saving version");
        }
        setIsSaving(false);
    };

    const handleFormat = () => toast.success("Code formatted!");
    const copyCode = () => { navigator.clipboard.writeText(code); toast.success("Code copied!"); };
    const handleReset = () => { if (confirm("Discard changes?")) setCode(originalCode); };

    const handleLoadSample = () => {
        setCode(SAMPLE_TSX);
        setHasUnsavedChanges(true);
        toast.success("Sample project injected!", {
            description: "Click 'Run Preview' to see it in action."
        });
        setActiveTab("editor");
    };

    const handleCopyClaudePrompt = () => {
        const prompt = getClaudePrompt(activePresetId, "", dimensions.durationInFrames / dimensions.fps);
        navigator.clipboard.writeText(prompt);
        toast.success("Claude prompt copied ✅", {
            description: "Paste it into Claude to generate your TSX."
        });
    };

    // File Upload Handler
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            setCode(content);
            setHasUnsavedChanges(true);
            toast.success(`Loaded: ${file.name}`);
            // Small delay to ensure state update propagates before tab switch
            setTimeout(() => {
                setActiveTab("editor");
            }, 100);
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
                    {/* Display Current Resolution and Duration from Code */}
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
                        projectId={projectId}
                        versionId={activeVersionId}
                        code={code}
                        disabled={isDemo}
                        isLoggedIn={isLoggedIn}
                        width={dimensions.width}
                        height={dimensions.height}
                        fps={dimensions.fps}
                        durationInFrames={dimensions.durationInFrames}
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
                                    <p className="text-[10px] text-muted-foreground leading-tight italic">
                                        You are viewing a secure read-only demo. Sign up to save your own projects.
                                    </p>
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
                        ) : validationResult?.valid ? (
                            <div className="w-full h-full relative group bg-black flex items-center justify-center p-4">
                                {/* Container that maintains correct aspect ratio */}
                                <div
                                    className="relative bg-black rounded-lg overflow-hidden shadow-2xl ring-1 ring-white/10"
                                    style={{
                                        aspectRatio: `${dimensions.width} / ${dimensions.height}`,
                                        maxWidth: '100%',
                                        maxHeight: '100%',
                                        width: dimensions.width > dimensions.height ? '100%' : 'auto',
                                        height: dimensions.height >= dimensions.width ? '100%' : 'auto',
                                    }}
                                >
                                    <LivePreview
                                        key={`${dimensions.width}-${dimensions.height}-${dimensions.durationInFrames}`}
                                        code={validatedCode}
                                        isValid={validationResult.valid}
                                        width={1080}
                                        height={1920}
                                        fps={30}
                                        durationInFrames={dimensions.durationInFrames}
                                    />
                                </div>
                            </div>
                        ) : validationResult && !validationResult.valid ? (
                            <div className="w-full max-w-lg p-8 rounded-[40px] bg-destructive/5 border border-destructive/20 text-center space-y-6">
                                <div className="w-20 h-20 rounded-3xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto">
                                    <AlertCircle className="w-10 h-10 text-destructive" />
                                </div>
                                <div>
                                    <h3 className="text-3xl font-black italic uppercase tracking-tighter text-destructive">Preview Blocked</h3>
                                    <p className="text-muted-foreground mt-2 italic font-medium">
                                        {validationResult.errors[0]?.message}
                                    </p>
                                </div>
                                <Button
                                    variant="outline"
                                    onClick={() => setActiveTab("editor")}
                                    className="border-destructive/20 text-destructive hover:bg-destructive/10"
                                >
                                    View Fix Log
                                </Button>
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
                        <TabsContent value="editor" className="flex-1 m-0" forceMount style={{ display: activeTab === 'editor' ? 'flex' : 'none', flex: 1 }}>
                            <Editor
                                path="file:///main.tsx"
                                height="100%"
                                defaultLanguage="typescript"
                                theme="vs-dark"
                                value={code}
                                onChange={handleCodeChange}
                                beforeMount={(monaco) => {
                                    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
                                        target: monaco.languages.typescript.ScriptTarget.Latest,
                                        allowNonTsExtensions: true,
                                        moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
                                        module: monaco.languages.typescript.ModuleKind.CommonJS,
                                        noEmit: true,
                                        esModuleInterop: true,
                                        jsx: monaco.languages.typescript.JsxEmit.React,
                                        reactNamespace: "React",
                                        allowJs: true,
                                    });
                                    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
                                        noSemanticValidation: false,
                                        noSyntaxValidation: false,
                                    });
                                    monaco.languages.typescript.typescriptDefaults.addExtraLib(
                                        `declare module 'remotion' {
                                            export const AbsoluteFill: any; export const Sequence: any; export const Loop: any;
                                            export const random: any; export const interpolate: any; export const spring: any; export const Easing: any;
                                            export const continueRender: any; export const delayRender: any; export const staticFile: any;
                                            export const useCurrentFrame: () => number; export const useVideoConfig: () => any;
                                            export const Img: any; export const Audio: any; export const Video: any; export const OffthreadVideo: any;
                                        }
                                        declare module 'react' {
                                            export function useState<T>(initialState: T | (() => T)): [T, (newState: T | ((prevState: T) => T)) => void];
                                            export function useEffect(effect: () => void | (() => void), deps?: ReadonlyArray<any>): void;
                                            export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: ReadonlyArray<any>): T;
                                            export function useMemo<T>(factory: () => T, deps: ReadonlyArray<any> | undefined): T;
                                            export function useRef<T>(initialValue: T): { current: T };
                                            export type FC<P = {}> = (props: P) => any;
                                            export type ReactNode = any;
                                            const React: any;
                                            export default React;
                                        }`,
                                        'file:///node_modules/@types/remotion/index.d.ts'
                                    );
                                    // Provide global React for JSX
                                    monaco.languages.typescript.typescriptDefaults.addExtraLib(
                                        `declare namespace React {
                                            interface HTMLAttributes<T> { style?: any; className?: string; }
                                            interface SVGAttributes<T> { style?: any; className?: string; }
                                        }`,
                                        'file:///node_modules/@types/react/global.d.ts'
                                    );
                                }}
                                loading={
                                    <div className="w-full h-full flex items-center justify-center bg-[#1e1e1e]">
                                        <div className="text-center">
                                            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                                            <p className="text-xs text-muted-foreground">Initializing Editor...</p>
                                        </div>
                                    </div>
                                }
                                options={{
                                    minimap: { enabled: false },
                                    fontSize: 13,
                                    automaticLayout: true,
                                    readOnly: isReadOnly
                                }}
                            />
                        </TabsContent>
                        <TabsContent value="presets" className="flex-1 p-6 m-0 bg-[#0A0A0B]">
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <h4 className="text-[10px] font-black uppercase text-primary tracking-widest italic">Claude Caption Presets</h4>
                                    <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                                        Use these optimized prompts to generate viral captions with Claude.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 gap-2">
                                    {CLAUDE_PRESETS.map(preset => (
                                        <button
                                            key={preset.id}
                                            onClick={() => setActivePresetId(preset.id)}
                                            className={cn(
                                                "p-4 rounded-2xl border text-left transition-all",
                                                activePresetId === preset.id
                                                    ? "bg-primary/10 border-primary/30"
                                                    : "bg-white/[0.02] border-white/5 hover:border-white/10"
                                            )}
                                        >
                                            <p className="text-xs font-black italic uppercase tracking-tighter mb-1">{preset.name}</p>
                                            <p className="text-[10px] text-muted-foreground leading-tight italic">{preset.description}</p>
                                        </button>
                                    ))}
                                </div>

                                <div className="p-4 rounded-2xl bg-black/40 border border-white/5">
                                    <pre className="text-[8px] font-mono text-muted-foreground/60 overflow-hidden line-clamp-4">
                                        {CLAUDE_PRESETS.find(p => p.id === activePresetId)?.prompt}
                                    </pre>
                                </div>

                                <Button onClick={handleCopyClaudePrompt} className="w-full h-12 rounded-xl font-black italic uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20">
                                    <Copy className="w-3 h-3 mr-2" /> Copy Prompt for Claude
                                </Button>
                            </div>
                        </TabsContent>
                        <TabsContent value="fixes" className="flex-1 m-0">
                            <ScrollArea className="h-full bg-red-500/[0.02]">
                                <div className="p-4 space-y-4">
                                    <div className="space-y-2 p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
                                        <h4 className="text-[10px] font-black uppercase text-red-500 tracking-widest flex items-center gap-2">
                                            <AlertCircle className="w-3 h-3" /> Critical Failures
                                        </h4>
                                    </div>

                                    {validationResult?.errors.map((error, idx) => (
                                        <div key={idx} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2 group">
                                            <div className="flex items-center justify-between">
                                                <h5 className="text-xs font-black italic uppercase tracking-tight text-white">{error.title}</h5>
                                                <Badge className={cn(
                                                    "text-[8px] font-black uppercase px-2 py-0 h-4 border-none shadow-none",
                                                    error.severity === 'error' ? "bg-red-500/20 text-red-500" : "bg-yellow-500/20 text-yellow-500"
                                                )}>
                                                    {error.severity}
                                                </Badge>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground leading-relaxed italic">{error.message}</p>
                                            {error.hint && (
                                                <div className="mt-2 p-3 rounded-xl bg-white/5 border border-white/5 space-y-2">
                                                    <p className="text-[9px] font-medium text-primary tracking-wide">💡 Suggestion:</p>
                                                    <p className="text-[10px] font-mono text-muted-foreground/80">{error.hint}</p>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 text-[8px] font-black uppercase px-2 hover:bg-white/10"
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(error.hint || "");
                                                            toast.success("Fix hint copied!");
                                                        }}
                                                    >
                                                        Copy Hint
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    <div className="pt-4 border-t border-white/5">
                                        <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] mb-4">Common Fixes</h4>
                                        <ul className="space-y-2 text-[10px] text-muted-foreground/60 italic font-medium leading-relaxed">
                                            <li className="flex gap-2"><span>•</span> Claude output must be ONE single TSX file</li>
                                            <li className="flex gap-2"><span>•</span> Do not include markdown or explanations in editor</li>
                                            <li className="flex gap-2"><span>•</span> Ensure export default exists at top level</li>
                                        </ul>
                                    </div>
                                </div>
                            </ScrollArea>
                        </TabsContent>
                        <TabsContent value="upload" className="flex-1 p-6 m-0 bg-[#0A0A0B]">
                            {!isReadOnly ? (
                                <div
                                    className="h-full flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-2xl bg-white/5 cursor-pointer hover:border-primary/30 hover:bg-primary/5 transition-all"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <input ref={fileInputRef} type="file" className="hidden" accept=".tsx,.ts" onChange={handleFileUpload} />
                                    <Upload className="w-8 h-8 text-primary mb-4" />
                                    <p className="text-sm text-muted-foreground">Click to Upload .tsx</p>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-white/10 rounded-2xl opacity-50">
                                    <Shield className="w-8 h-8 mb-4 text-muted-foreground" />
                                    <p className="text-xs font-black uppercase text-muted-foreground mb-1 tracking-widest">Protected Activity</p>
                                    <p className="text-[10px] italic leading-relaxed">Uploads are disabled in demo mode. Sign in to push your own code.</p>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}
