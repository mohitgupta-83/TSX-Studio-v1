"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
    Upload,
    FileAudio,
    Loader2,
    CheckCircle2,
    XCircle,
    Download,
    Copy,
    Clock,
    Mic,
    Play,
    Trash2,
    RefreshCw,
    FileJson2,
    Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { CLAUDE_PRESETS, getClaudePrompt } from "@/lib/claudePresets";

interface TranscriptionJob {
    id: string;
    status: string;
    model: string;
    fileName: string;
    durationSeconds: number | null;
    errorMessage: string | null;
    createdAt: string;
    updatedAt: string;
    hasOutput: boolean;
    transcriptionOutput?: string; // Store the full JSON string
}

interface TranscribeClientProps {
    initialJobs: TranscriptionJob[];
}

const MODELS = [
    { value: "tiny", label: "Tiny", desc: "~75MB, Fastest" },
    { value: "base", label: "Base", desc: "~150MB, Balanced" },
    { value: "small", label: "Small", desc: "~500MB, Better" },
    { value: "medium", label: "Medium", desc: "~1.5GB, Best" },
];

export function TranscribeClient({ initialJobs }: TranscribeClientProps) {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [jobs, setJobs] = useState<TranscriptionJob[]>(initialJobs);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [selectedModel, setSelectedModel] = useState("base");
    const [selectedLanguage, setSelectedLanguage] = useState("auto");
    const [selectedScript, setSelectedScript] = useState("Auto");
    const [isUploading, setIsUploading] = useState(false);
    const [activeJobId, setActiveJobId] = useState<string | null>(null);
    const [previewJson, setPreviewJson] = useState<string | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [selectedPreset, setSelectedPreset] = useState(CLAUDE_PRESETS[0].id);
    const [lastLog, setLastLog] = useState<string>("Initializing...");
    const [captionStyle, setCaptionStyle] = useState("clean");
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedProjectId, setGeneratedProjectId] = useState<string | null>(null);

    // Electron Progress Listener
    useEffect(() => {
        if (typeof window !== 'undefined' && (window as any).electronAPI) {
            (window as any).electronAPI.onTranscribeProgress((p: number) => {
                // completion handled by async
            });
            (window as any).electronAPI.onTranscribeLog((log: string) => {
                console.log("[Whisper]", log);
                setLastLog(log);
            });
        }
    }, []);

    // Auto-switch script and model based on language selection
    useEffect(() => {
        // 1. Script Selection Logic
        if (selectedLanguage === "hi") {
            setSelectedScript("Hindi");
        } else if (selectedLanguage === "ur") {
            setSelectedScript("Urdu");
        } else if (selectedLanguage === "hinglish") {
            setSelectedScript("Romanized");
        }

        // 2. Model Auto-Selection Rule for Hindi/Hinglish
        if (selectedLanguage === "hi" || selectedLanguage === "hinglish") {
            if (selectedModel === "tiny" || selectedModel === "base") {
                setSelectedModel("small");
            }
        }
    }, [selectedLanguage]);

    // Load persisted jobs on mount
    useEffect(() => {
        const saved = localStorage.getItem("tsx-studio-jobs");
        if (saved) {
            try {
                setJobs(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse jobs", e);
            }
        }
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file && isValidFile(file)) {
            console.log("File dropped:", file.name, (file as any).path);
            setSelectedFile(file);
        } else {
            toast.error("Invalid file type. Use MP3, MP4, WAV, or M4A");
        }
    }, []);

    const isValidFile = (file: File) => {
        const ext = file.name.toLowerCase().split(".").pop();
        return ["mp3", "mp4", "wav", "m4a", "aac", "flac", "ogg", "wma"].includes(ext || "");
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && isValidFile(file)) {
            setSelectedFile(file);
        } else if (file) {
            toast.error("Invalid file type. Use MP3, MP4, WAV, M4A, or other audio/video formats");
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) return;

        // Check for Electron Env
        const isElectron = typeof window !== 'undefined' && (window as any).electronAPI;
        if (!isElectron) {
            toast.error("Desktop App Required", { description: "Local transcription requires the desktop app." });
            return;
        }

        setIsUploading(true);
        try {
            const filePath = (selectedFile as any).path;
            if (!filePath) {
                console.error("File object missing path property:", selectedFile);
                throw new Error("File path not found. Please drag and drop the file again.");
            }

            console.log("Starting transcription for:", filePath);
            setActiveJobId("local-job");

            // Call Electron API
            const result = await (window as any).electronAPI.transcribeMedia({
                filePath,
                model: selectedModel,
                language: selectedLanguage
            });

            console.log("Transcription result:", result);

            if (result.success) {
                const parsed = JSON.parse(result.transcription);
                const newJob: TranscriptionJob = {
                    id: Math.random().toString(36).substr(2, 9),
                    status: "DONE",
                    model: selectedModel,
                    fileName: selectedFile.name,
                    durationSeconds: parsed.duration || 0,
                    errorMessage: null,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    hasOutput: true,
                    transcriptionOutput: result.transcription // Save the content
                };

                setJobs(prev => {
                    const updated = [newJob, ...prev];
                    localStorage.setItem("tsx-studio-jobs", JSON.stringify(updated));
                    return updated;
                });
                setPreviewJson(result.transcription);
                toast.success("Transcription Complete!");
                setSelectedFile(null);
                setActiveJobId(null); // Fix: Clear loading state on success
            } else {

                // Check if engine missing
                if (result.error && result.error.includes("not found")) {
                    toast.error("AI Engine Missing", {
                        description: "One-click setup required.",
                        action: {
                            label: "Install Engine",
                            onClick: () => {
                                toast.promise((window as any).electronAPI.installWhisperEngine(), {
                                    loading: 'Installing AI Engine...',
                                    success: 'Installed! Try again.',
                                    error: 'Installation failed.'
                                });
                            }
                        }
                    });
                } else {
                    toast.error("Transcription Failed", { description: result.error });
                }
                setActiveJobId(null); // Clear loading state
            }

        } catch (error: any) {
            setLastLog(`[ERROR] ${error.message}`); // Persist error to log
            toast.error(error.message || "Transcription failed");
            setActiveJobId(null); // Clear loading state
        } finally {
            setIsUploading(false);
            // Don't clear activeJobId if successful to show result
        }
    };

    const handleDownload = async (jobId: string) => {
        // If local job or downloaded job, we might need a different logic
        // But for UI demo we just download the existing JSON in state
        if (previewJson) {
            const blob = new Blob([previewJson], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "transcript.json";
            a.click();
        } else {
            toast.error("No output available to download");
        }
    };

    const handleCopyJson = () => {
        if (previewJson) {
            navigator.clipboard.writeText(previewJson);
            toast.success("JSON copied to clipboard!");
        }
    };

    const handleCopyClaudePrompt = () => {
        if (previewJson) {
            const job = jobs.find(j => !!previewJson); // Simple heuristic
            const duration = job?.durationSeconds || 30;
            const prompt = getClaudePrompt(selectedPreset, previewJson, duration);
            navigator.clipboard.writeText(prompt);
            toast.success("Claude prompt copied ✅", {
                description: "Paste this into Claude to get your TSX code."
            });
        }
    };

    const handleDeleteJob = async (jobId: string) => {
        setJobs(prev => {
            const updated = prev.filter(j => j.id !== jobId);
            localStorage.setItem("tsx-studio-jobs", JSON.stringify(updated));
            return updated;
        });
        if (previewJson) setPreviewJson(null);
        toast.success("Job removed from history");
    };

    const handleGenerateTSX = async () => {
        if (!previewJson) return;

        setIsGenerating(true);
        try {
            // 1. Generate TSX
            const res = await fetch("/api/generate-tsx", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    json: JSON.parse(previewJson),
                    style: captionStyle,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to generate TSX");

            const tsxCode = data.tsxCode;
            toast.success("Captions generated successfully");

            // 2. Create Project
            const projectRes = await fetch("/api/projects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Caption Animation" }),
            });
            const projectData = await projectRes.json();
            if (!projectRes.ok) throw new Error("Failed to create project");

            // 3. Create ProjectVersion
            const versionRes = await fetch(`/api/projects/${projectData.id}/versions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: tsxCode, title: "Generated Captions" }),
            });
            if (!versionRes.ok) throw new Error("Failed to save TSX");

            // 4. Redirect to Studio
            setGeneratedProjectId(projectData.id);
            router.push(`/studio/${projectData.id}`);

        } catch (error: any) {
            if (error.message === "Not enough credits") {
                toast.error("Not enough credits", {
                    description: "You need more credits to generate AI motions.",
                    action: {
                        label: "Get Credits",
                        onClick: () => router.push("/dashboard/credits")
                    }
                });
            } else {
                toast.error(error.message || "Failed to generate captions");
            }
        } finally {
            setIsGenerating(false);
        }
    };

    const getStatusBadge = (job: TranscriptionJob) => {
        switch (job.status) {
            case "DONE":
                return <Badge className="bg-green-500/10 text-green-400 border-green-500/20"><CheckCircle2 className="w-3 h-3 mr-1" /> Done</Badge>;
            case "RUNNING":
                return <Badge className="bg-primary/10 text-primary border-primary/20"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Running</Badge>;
            case "FAILED":
                return (
                    <div className="group/error relative">
                        <Badge className="bg-destructive/10 text-destructive border-destructive/20 cursor-help">
                            <XCircle className="w-3 h-3 mr-1" /> Failed
                        </Badge>
                        {job.errorMessage && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 rounded-xl bg-destructive text-[10px] text-white font-mono z-50 opacity-0 group-hover/error:opacity-100 transition-opacity pointer-events-none break-words shadow-2xl">
                                {job.errorMessage}
                            </div>
                        )}
                    </div>
                );
            default:
                return <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20"><Clock className="w-3 h-3 mr-1" /> Queued</Badge>;
        }
    };

    const isElectron = typeof window !== 'undefined' && (window as any).electronAPI;

    return (
        <div className="p-8 space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black italic tracking-tighter">
                        Audio <span className="text-primary">Transcriber</span>
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Generate timestamped captions from video or audio using Whisper AI.
                    </p>
                </div>
                {isElectron && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.refresh()}
                        className="border-white/10"
                    >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                    </Button>
                )}
            </div>

            {!isElectron ? (
                <div className="max-w-4xl mx-auto py-12">
                    <div className="bg-gradient-to-br from-primary/10 to-blue-500/10 border border-white/5 rounded-[48px] p-12 text-center space-y-8 relative overflow-hidden backdrop-blur-3xl shadow-2xl">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-30" />

                        <div className="w-24 h-24 bg-white/5 border border-white/10 rounded-3xl mx-auto flex items-center justify-center shadow-inner">
                            <Mic className="w-12 h-12 text-primary" />
                        </div>

                        <div className="space-y-4 max-w-2xl mx-auto">
                            <h2 className="text-4xl font-black italic tracking-tight uppercase leading-none">
                                Local AI Transcription <br />
                                <span className="text-primary">Desktop Only</span>
                            </h2>
                            <p className="text-lg text-white/40 font-medium leading-relaxed">
                                To ensure privacy and zero-cost processing, our Whisper AI engine runs directly on your hardware. Web-based transcription is coming soon.
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                            <Button
                                onClick={() => {
                                    toast.info("Preparing Download", {
                                        description: "Windows may ask for confirmation on first install.",
                                        duration: 3000
                                    });
                                    router.push('/download');
                                }}
                                size="lg"
                                className="h-16 px-10 bg-white text-black hover:bg-neutral-200 font-black italic rounded-2xl transition-all active:scale-95 text-base"
                            >
                                <Download className="w-5 h-5 mr-3" />
                                DOWNLOAD DESKTOP APP
                            </Button>
                            <Button
                                variant="ghost"
                                size="lg"
                                className="h-16 px-10 border border-white/5 font-black uppercase tracking-widest text-xs opacity-50 hover:opacity-100"
                            >
                                LEARN MORE
                            </Button>
                        </div>

                        <div className="grid grid-cols-3 gap-8 pt-8 border-t border-white/5 mt-8">
                            <div className="text-center">
                                <p className="text-xl font-bold text-white italic">0.0$</p>
                                <p className="text-[10px] text-white/20 font-black uppercase tracking-widest mt-1">Cost Per Minute</p>
                            </div>
                            <div className="text-center">
                                <p className="text-xl font-bold text-white italic">100%</p>
                                <p className="text-[10px] text-white/20 font-black uppercase tracking-widest mt-1">Data Privacy</p>
                            </div>
                            <div className="text-center">
                                <p className="text-xl font-bold text-white italic">Auto</p>
                                <p className="text-[10px] text-white/20 font-black uppercase tracking-widest mt-1">Language Detect</p>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Panel - Uploader */}
                    <div className="space-y-6">
                        {/* Dropzone */}
                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`
                        relative border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all duration-300
                        ${isDragOver ? "border-primary bg-primary/5 scale-[1.02]" : "border-white/10 hover:border-white/20 bg-card/30"}
                        ${selectedFile ? "border-primary bg-primary/5" : ""}
                            `}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".mp3,.mp4,.wav,.m4a,.aac,.flac,.ogg,.wma"
                                onChange={handleFileSelect}
                                onClick={(e) => (e.target as any).value = null}
                                className="hidden"
                            />

                            {selectedFile ? (
                                <div className="space-y-4">
                                    <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
                                        <FileAudio className="w-8 h-8 text-primary" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-lg">{selectedFile.name}</p>
                                        <p className="text-muted-foreground text-sm">
                                            {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                                        </p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                                    >
                                        Change File
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
                                        <Upload className="w-8 h-8 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-lg">Drop your file here</p>
                                        <p className="text-muted-foreground text-sm">
                                            or click to browse (MP3, MP4, WAV, M4A up to 200MB)
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Settings */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2 sm:col-span-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-2">
                                    Whisper Model
                                </label>
                                <Select value={selectedModel} onValueChange={setSelectedModel}>
                                    <SelectTrigger className="bg-card/50 border-white/10 h-12">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card/90 backdrop-blur-xl border-white/10">
                                        {MODELS.map(model => (
                                            <SelectItem key={model.value} value={model.value}>
                                                <div className="flex items-center gap-3">
                                                    <span className="font-bold">{model.label}</span>
                                                    <span className="text-xs text-muted-foreground">{model.desc}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="col-span-2 sm:col-span-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-2">
                                    Language
                                </label>
                                <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                                    <SelectTrigger className="bg-card/50 border-white/10 h-12">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card/90 backdrop-blur-xl border-white/10">
                                        <SelectItem value="auto">Auto Detect</SelectItem>
                                        <SelectItem value="en">English</SelectItem>
                                        <SelectItem value="hi">Hindi (Pure)</SelectItem>
                                        <SelectItem value="hinglish">Hinglish (Hindi + English)</SelectItem>
                                        <SelectItem value="ur">Urdu</SelectItem>
                                        <SelectItem value="es">Spanish</SelectItem>
                                        <SelectItem value="fr">French</SelectItem>
                                    </SelectContent>
                                </Select>
                                {selectedLanguage === "hinglish" && (
                                    <p className="text-[10px] text-primary mt-1 px-1 font-medium animate-in fade-in slide-in-from-top-1">
                                        Best for mixed Hindi + English speech. Brand names stay in English.
                                    </p>
                                )}
                            </div>

                            <div className="col-span-2 sm:col-span-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-2">
                                    Script Output
                                </label>
                                <Select value={selectedScript} onValueChange={setSelectedScript}>
                                    <SelectTrigger className="bg-card/50 border-white/10 h-12">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card/90 backdrop-blur-xl border-white/10">
                                        <SelectItem value="Auto">Default</SelectItem>
                                        <SelectItem value="Hindi">Hindi (Devanagari)</SelectItem>
                                        <SelectItem value="Mixed">Mixed (Hindi + English Script)</SelectItem>
                                        <SelectItem value="Romanized">Romanized Hindi (English Letters)</SelectItem>
                                        <SelectItem value="Urdu">Urdu (Arabic)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="col-span-2 sm:col-span-1 flex items-end">
                                <Button
                                    onClick={handleUpload}
                                    disabled={!selectedFile || isUploading || !!activeJobId}
                                    className="h-12 w-full rounded-xl font-black italic uppercase text-xs tracking-widest shadow-lg shadow-primary/20"
                                >
                                    {isUploading ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading</>
                                    ) : activeJobId ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing</>
                                    ) : (
                                        <><Mic className="w-4 h-4 mr-2" /> Transcribe</>
                                    )}
                                </Button>
                            </div>
                        </div>

                        {/* Job History */}
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                Recent Transcriptions
                            </h3>

                            {jobs.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <FileJson2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                    <p>No transcriptions yet</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {jobs.map(job => (
                                        <div
                                            key={job.id}
                                            className="flex items-center gap-4 p-4 rounded-2xl bg-card/30 border border-white/5 hover:border-white/10 transition-all group"
                                        >
                                            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                                                <FileAudio className="w-5 h-5 text-muted-foreground" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium truncate">{job.fileName}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {getStatusBadge(job)}
                                                {job.hasOutput && (
                                                    <>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 opacity-0 group-hover:opacity-100"
                                                            onClick={() => setPreviewJson(job.transcriptionOutput || JSON.stringify({ error: "No content saved for this job" }))}
                                                        >
                                                            <Play className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 opacity-0 group-hover:opacity-100"
                                                            onClick={() => handleDownload(job.id)}
                                                        >
                                                            <Download className="w-4 h-4" />
                                                        </Button>
                                                    </>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 opacity-0 group-hover:opacity-100 text-destructive"
                                                    onClick={() => handleDeleteJob(job.id)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Panel - Preview */}
                    <div className="space-y-6">
                        {/* Status Card */}
                        {activeJobId && (
                            <div className="p-6 rounded-3xl bg-primary/5 border border-primary/20 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                                </div>
                                <div>
                                    <p className="font-bold">Transcription in Progress</p>
                                    <p className="text-sm text-muted-foreground">
                                        Using Local Engine. Please wait.
                                    </p>
                                    <div className="mt-2 h-20 w-80 bg-black/50 rounded-lg p-2 overflow-hidden border border-white/10">
                                        <p className="font-mono text-[10px] text-green-400/80 animate-pulse">
                                            {lastLog}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Error State Card - Keeps logs visible */}
                        {!activeJobId && lastLog && lastLog.toLowerCase().includes("error") && (
                            <div className="p-6 rounded-3xl bg-destructive/10 border border-destructive/20 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-destructive/20 flex items-center justify-center">
                                    <XCircle className="w-6 h-6 text-destructive" />
                                </div>
                                <div>
                                    <p className="font-bold text-destructive">Transcription Failed</p>
                                    <p className="text-sm text-muted-foreground mb-2">
                                        The engine encountered an error.
                                    </p>
                                    <div className="h-24 w-80 bg-black/50 rounded-lg p-3 overflow-y-auto border border-destructive/20 font-mono text-[10px] text-destructive/80">
                                        {lastLog}
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="mt-2 text-xs text-destructive hover:bg-destructive/10"
                                        onClick={() => setLastLog("Initializing...")}
                                    >
                                        Dismiss
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* JSON Preview */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                    JSON Output
                                </h3>
                                {previewJson && (
                                    <div className="flex gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleCopyJson}
                                            className="h-8 text-xs"
                                        >
                                            <Copy className="w-3 h-3 mr-1" />
                                            Copy JSON
                                        </Button>

                                        <div className="flex items-center gap-1 bg-white/5 rounded-lg border border-white/10 p-1">
                                            <Select value={selectedPreset} onValueChange={setSelectedPreset}>
                                                <SelectTrigger className="h-6 text-[9px] bg-transparent border-none shadow-none w-28 uppercase font-bold tracking-widest">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="bg-card/90 backdrop-blur-xl border-white/10">
                                                    {CLAUDE_PRESETS.map(p => (
                                                        <SelectItem key={p.id} value={p.id} className="text-[10px] uppercase font-bold">{p.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>

                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={handleCopyClaudePrompt}
                                                className="h-6 text-[9px] text-primary uppercase font-bold tracking-widest hover:bg-primary/10"
                                            >
                                                <Sparkles className="w-3 h-3 mr-1" />
                                                Copy Prompt
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="relative rounded-2xl bg-[#0A0A0B] border border-white/5 overflow-hidden min-h-[400px]">
                                {previewJson ? (
                                    <pre className="p-6 text-sm font-mono text-green-400/80 overflow-auto max-h-[500px]">
                                        {JSON.stringify(JSON.parse(previewJson), null, 2)}
                                    </pre>
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                                        <div className="text-center">
                                            <FileJson2 className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                            <p className="text-sm">Upload and transcribe a file to see the JSON output</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Generate TSX Panel */}
                        {previewJson && (
                            <div className="space-y-4 pt-4 border-t border-white/10">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                    Generate Captions
                                </h3>
                                <div className="flex gap-4">
                                    <Select value={captionStyle} onValueChange={setCaptionStyle}>
                                        <SelectTrigger className="h-12 bg-card/50 border-white/10 flex-1 uppercase text-xs tracking-widest font-bold">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-card/90 backdrop-blur-xl border-white/10">
                                            <SelectItem value="clean">Clean Subtitles</SelectItem>
                                            <SelectItem value="tiktok">TikTok Viral</SelectItem>
                                            <SelectItem value="neon">Neon Glow</SelectItem>
                                            <SelectItem value="mrbeast">MrBeast Style</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    {!generatedProjectId ? (
                                        <Button
                                            onClick={handleGenerateTSX}
                                            disabled={isGenerating}
                                            className="h-12 flex-1 rounded-xl font-black italic uppercase text-xs tracking-widest shadow-lg shadow-primary/20 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/50"
                                        >
                                            {isGenerating ? (
                                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating</>
                                            ) : (
                                                <><Sparkles className="w-4 h-4 mr-2" /> Generate TSX</>
                                            )}
                                        </Button>
                                    ) : (
                                        <Button
                                            onClick={() => router.push(`/studio/${generatedProjectId}`)}
                                            className="h-12 flex-1 rounded-xl font-black italic uppercase text-xs tracking-widest shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground"
                                        >
                                            Edit Animation
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        {previewJson && (
                            <div className="flex gap-4">
                                <Button
                                    onClick={() => handleDownload("current")}
                                    className="flex-1 h-12 rounded-xl font-black italic uppercase text-xs tracking-widest"
                                >
                                    <Download className="w-4 h-4 mr-2" />
                                    Download JSON
                                </Button>
                                <div className="flex items-center gap-1 bg-white/5 rounded-xl border border-white/10 p-1 flex-1">
                                    <Select value={selectedPreset} onValueChange={setSelectedPreset}>
                                        <SelectTrigger className="h-10 text-[10px] bg-transparent border-none shadow-none flex-1 uppercase font-bold tracking-widest">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-card/90 backdrop-blur-xl border-white/10">
                                            {CLAUDE_PRESETS.map(p => (
                                                <SelectItem key={p.id} value={p.id} className="text-[10px] uppercase font-bold">{p.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button
                                        variant="outline"
                                        onClick={handleCopyClaudePrompt}
                                        className="h-10 px-6 rounded-lg font-black italic uppercase text-[10px] tracking-widest border-primary/20 text-primary hover:bg-primary/10"
                                    >
                                        <Sparkles className="w-4 h-4 mr-2" />
                                        Copy Claude Prompt
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )
            }
        </div >
    );
}
