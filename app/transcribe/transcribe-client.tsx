"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
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
import { Input } from "@/components/ui/input";
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

function transliterateDevanagari(text: string): string {
    const vowels: Record<string, string> = {
        'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo', 'ऋ': 'ri',
        'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au', 'अं': 'an', 'अः': 'ah'
    };
    const matras: Record<string, string> = {
        'ा': 'aa', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo', 'ृ': 'ri',
        'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au', 'ं': 'n', 'ः': 'h', 'ँ': 'n',
        'ॉ': 'o', 'ोः': 'oh'
    };
    const consonants: Record<string, string> = {
        'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'n',
        'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'n',
        'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
        'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
        'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
        'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v', 'श': 'sh', 'ष': 'sh', 'स': 's', 'ह': 'h',
        'क्ष': 'ksh', 'त्र': 'tr', 'ज्ञ': 'gy',
        'ड़': 'r', 'ढ़': 'rh', 'फ़': 'f', 'ज़': 'z', 'क़': 'q', 'ख़': 'kh', 'ग़': 'g'
    };

    let result = '';
    let i = 0;
    while (i < text.length) {
        const char = text[i];
        
        if (char === '।') {
            result += '.';
            i += 1;
            continue;
        }

        // Handle double-character consonants (with nukta like ड़, ढ़, फ़, ज़, क़, ख़, ग़)
        if (i + 1 < text.length && text[i + 1] === '़') {
            const composite = char + '़';
            const baseCons = consonants[composite];
            if (baseCons) {
                let nextChar = (i + 2 < text.length) ? text[i + 2] : '';
                if (nextChar === '्') {
                    // Suppressed vowel
                    result += baseCons;
                    i += 3;
                } else if (matras[nextChar]) {
                    // With a matra
                    result += baseCons + matras[nextChar];
                    i += 3;
                } else {
                    // Inherent vowel 'a'
                    const isEndOrWordBreak = !nextChar || /\s|[.,!?;:'"()[\]{}]/.test(nextChar);
                    result += baseCons + (isEndOrWordBreak ? '' : 'a');
                    i += 2;
                }
                continue;
            }
        }

        if (consonants[char]) {
            const baseCons = consonants[char];
            let nextChar = (i + 1 < text.length) ? text[i + 1] : '';
            if (nextChar === '्') {
                // Suppressed vowel
                result += baseCons;
                i += 2;
            } else if (matras[nextChar]) {
                // With a matra
                result += baseCons + matras[nextChar];
                i += 2;
            } else {
                // Inherent vowel 'a'
                const isEndOrWordBreak = !nextChar || /\s|[.,!?;:'"()[\]{}]/.test(nextChar);
                result += baseCons + (isEndOrWordBreak ? '' : 'a');
                i += 1;
            }
        } else if (vowels[char]) {
            result += vowels[char];
            i += 1;
        } else if (matras[char]) {
            result += matras[char];
            i += 1;
        } else {
            result += char;
            i += 1;
        }
    }
    return result;
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
    const [rawTranscript, setRawTranscript] = useState<any>(null);
    const [resegmentWords, setResegmentWords] = useState<number>(0);
    const [capitalization, setCapitalization] = useState<"original" | "sentence" | "segment" | "uppercase" | "word">("original");
    const [activeTab, setActiveTab] = useState("json");
    const [isDragOver, setIsDragOver] = useState(false);
    const [selectedPreset, setSelectedPreset] = useState(CLAUDE_PRESETS[0].id);
    const [lastLog, setLastLog] = useState<string>("Initializing...");
    const [captionStyle, setCaptionStyle] = useState("clean");
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedProjectId, setGeneratedProjectId] = useState<string | null>(null);
    const [transcriptionMode, setTranscriptionMode] = useState<"cloud" | "local">("cloud");
    const [mainTab, setMainTab] = useState<"upload" | "import">("upload");
    const [importText, setImportText] = useState("");
    const [groqApiKey, setGroqApiKey] = useState("");

    const handleApiKeyChange = (val: string) => {
        setGroqApiKey(val);
        if (typeof window !== "undefined") {
            localStorage.setItem("tsx-studio-groq-key", val);
        }
    };

    const transcript = useMemo(() => {
        if (!rawTranscript) return null;

        const actualJson = rawTranscript.json ? rawTranscript.json : rawTranscript;
        if (!actualJson || !actualJson.segments) {
            return { json: actualJson, srt: rawTranscript.srt || "", txt: rawTranscript.txt || "" };
        }

        const shouldTransliterate = selectedScript === "Romanized" || selectedLanguage === "hinglish";

        // 1. Extract all words from original segments
        let wordsList: Array<{ word: string; start: number; end: number }> = [];
        actualJson.segments.forEach((seg: any) => {
            const segText = shouldTransliterate ? transliterateDevanagari(seg.text) : seg.text;
            if (seg.words && seg.words.length > 0) {
                wordsList.push(...seg.words.map((w: any) => ({
                    word: shouldTransliterate ? transliterateDevanagari(w.word.trim()) : w.word.trim(),
                    start: w.start,
                    end: w.end
                })));
            } else {
                // Fallback: split by space and distribute time evenly
                const words = segText.split(/\s+/).filter(Boolean);
                const count = words.length;
                const duration = seg.end - seg.start;
                words.forEach((w: string, idx: number) => {
                    wordsList.push({
                        word: w,
                        start: seg.start + (idx / count) * duration,
                        end: seg.start + ((idx + 1) / count) * duration
                    });
                });
            }
        });

        // 2. Resegment if requested
        let processedSegments: any[] = [];
        if (resegmentWords > 0) {
            for (let i = 0; i < wordsList.length; i += resegmentWords) {
                const chunk = wordsList.slice(i, i + resegmentWords);
                if (chunk.length === 0) continue;
                processedSegments.push({
                    start: chunk[0].start,
                    end: chunk[chunk.length - 1].end,
                    text: chunk.map(w => w.word).join(" "),
                    words: chunk
                });
            }
        } else {
            // Use original segments, but clone them to avoid mutations
            processedSegments = actualJson.segments.map((seg: any) => ({
                ...seg,
                text: shouldTransliterate ? transliterateDevanagari(seg.text) : seg.text,
                words: (seg.words || []).map((w: any) => ({
                    ...w,
                    word: shouldTransliterate ? transliterateDevanagari(w.word) : w.word
                }))
            }));
        }

        // Helper function to capitalize a string based on rules
        const capitalizeText = (text: string) => {
            if (capitalization === "uppercase") {
                return text.toUpperCase();
            }
            if (capitalization === "word") {
                return text.replace(/(?:^|\s)\S/g, c => c.toUpperCase());
            }
            if (capitalization === "segment") {
                const trimmed = text.trimStart();
                if (trimmed.length > 0) {
                    const leadingSpaces = text.slice(0, text.length - trimmed.length);
                    return leadingSpaces + trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
                }
                return text;
            }
            if (capitalization === "sentence") {
                // Capitalize first letter of each sentence
                return text.replace(/(^\s*|[.!?]\s+)([a-z\u00C0-\u00FF])/gi, (m, p1, p2) => p1 + p2.toUpperCase());
            }
            return text; // original
        };

        // 3. Process text capitalization
        const finalSegments = processedSegments.map((seg, idx) => {
            let text = seg.text;
            
            // Apply capitalization rules
            text = capitalizeText(text);

            // If we have words, we should also update the word list capitalization
            const finalWords = seg.words ? seg.words.map((w: any) => {
                let capitalizedWord = w.word;
                if (capitalization === "uppercase") {
                    capitalizedWord = w.word.toUpperCase();
                } else if (capitalization === "word") {
                    capitalizedWord = w.word.charAt(0).toUpperCase() + w.word.slice(1);
                }
                return {
                    ...w,
                    word: capitalizedWord
                };
            }) : [];

            return {
                id: idx + 1,
                start: Number(seg.start.toFixed(2)),
                end: Number(seg.end.toFixed(2)),
                text,
                words: finalWords
            };
        });

        const jsonOutput = {
            language: actualJson.language || "en",
            duration: actualJson.duration || (finalSegments.length > 0 ? finalSegments[finalSegments.length - 1].end : 0),
            segments: finalSegments
        };

        // Generate TXT format
        const txtOutput = finalSegments.map(s => s.text).join(' ');

        // Generate SRT format
        const formatSrtTime = (seconds: number) => {
            const hh = String(Math.floor(seconds / 3600)).padStart(2, '0');
            const mm = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
            const ss = String(Math.floor(seconds % 60)).padStart(2, '0');
            const ms = String(Math.floor((seconds * 1000) % 1000)).padStart(3, '0');
            return `${hh}:${mm}:${ss},${ms}`;
        };
        
        const srtOutput = finalSegments.map((s, i) => {
            return `${i + 1}\n${formatSrtTime(s.start)} --> ${formatSrtTime(s.end)}\n${s.text}\n`;
        }).join('\n');

        return {
            json: jsonOutput,
            srt: srtOutput.trim(),
            txt: txtOutput.trim()
        };
    }, [rawTranscript, resegmentWords, capitalization, selectedScript, selectedLanguage]);

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
        const savedKey = localStorage.getItem("tsx-studio-groq-key");
        if (savedKey) {
            setGroqApiKey(savedKey);
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

    const handleImport = () => {
        if (!importText.trim()) {
            toast.error("Please paste transcript content.");
            return;
        }

        try {
            const isSrt = importText.includes('-->');
            let parsedSegments = [];

            if (isSrt) {
                const blocks = importText.split(/\n\s*\n/).filter(x => x.trim().length > 0);
                parsedSegments = blocks.map((block: string) => {
                    const lines = block.split('\n');
                    const timeCodeLine = lines.find((l: string) => l.includes('-->'));
                    if (!timeCodeLine) return null;
                    
                    const textLines = lines.slice(lines.indexOf(timeCodeLine) + 1).join(' ').trim();
                    const [startStr, endStr] = timeCodeLine.split('-->').map((s: string) => s.trim());
                    
                    const parseTime = (str: string) => {
                        const [hours, mins, rest] = str.split(':');
                        const [secs, ms] = rest.split(',');
                        return parseInt(hours) * 3600 + parseInt(mins) * 60 + parseInt(secs) + (parseInt(ms) || 0) / 1000;
                    };
                    
                    return {
                        start: parseTime(startStr),
                        end: parseTime(endStr),
                        text: textLines
                    };
                }).filter(Boolean);
            } else {
                const sentences = importText.match(/[^.!?]+[.!?]+|\s*[^.!?]+\s*$/g)?.map(s => s.trim()).filter(x => x.length > 0) || [];
                const estDurationPerSentence = 3; 
                parsedSegments = sentences.map((sentence, index) => {
                    return {
                        start: index * estDurationPerSentence,
                        end: (index + 1) * estDurationPerSentence,
                        text: sentence
                    };
                });
            }

            const cleanJsonData = {
                language: 'en',
                duration: parsedSegments.length ? parsedSegments[parsedSegments.length - 1]?.end || 0 : 0,
                segments: parsedSegments
            };

            setRawTranscript({
                json: cleanJsonData,
                srt: isSrt ? importText : "",
                txt: !isSrt ? importText : ""
            });
            setActiveTab("json");
            setMainTab("upload");
            toast.success("Transcript Imported!");

        } catch (error) {
            toast.error("Failed to parse transcript. Check format.");
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) return;

        if (transcriptionMode === "cloud") {
            setIsUploading(true);
            setActiveJobId("cloud-job");
            setLastLog("Uploading to Cloud...");

            try {
                const formData = new FormData();
                formData.append("file", selectedFile);
                formData.append("language", selectedLanguage);
                formData.append("script", selectedScript);
                if (groqApiKey) {
                    formData.append("groqApiKey", groqApiKey);
                }

                const response = await fetch("/api/transcribe-groq", {
                    method: "POST",
                    body: formData
                });

                if (!response.ok) {
                    throw new Error("Cloud transcription unavailable. Try again or use desktop version.");
                }

                const result = await response.json();
                if (result.success) {
                    const parsed = JSON.parse(result.transcription);
                    const isComplex = ["hi", "hinglish", "mr", "ta", "te", "bn", "ur", "ml", "kn", "gu", "pa", "or", "as"].includes(selectedLanguage);
                    const chosenModel = isComplex ? 'whisper-large-v3-turbo' : 'whisper-large-v3';
                    const newJob = {
                        id: Math.random().toString(36).substr(2, 9),
                        status: "DONE",
                        model: chosenModel,
                        fileName: selectedFile.name,
                        durationSeconds: parsed.json?.duration || parsed.duration || 0,
                        errorMessage: null,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        hasOutput: true,
                        transcriptionOutput: result.transcription
                    };

                    setJobs(prev => {
                        const updated = [newJob, ...prev];
                        localStorage.setItem("tsx-studio-jobs", JSON.stringify(updated));
                        return updated;
                    });

                    setRawTranscript(parsed);
                    setActiveTab("json");
                    toast.success("Cloud Transcription Complete!");
                    setSelectedFile(null);
                } else {
                    throw new Error("Cloud transcription failed");
                }
            } catch (error: any) {
                toast.error(error.message || "Cloud transcription unavailable. Try again or use desktop version.");
                setLastLog(`[ERROR] ${error.message}`);
            } finally {
                setIsUploading(false);
                setActiveJobId(null);
            }
            return;
        }

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
                model: selectedModel, script: selectedScript,
                language: selectedLanguage
            });

            console.log("TRANSCRIBE RESPONSE:", result);

            if (result.success) {
                const parsed = JSON.parse(result.transcription);
                console.log("PARSED TRANSCRIPTION KEYS:", Object.keys(parsed));
                console.log("JSON segments:", parsed.segments?.length || 0);
                console.log("SRT length:", (parsed.srt || "").length);
                console.log("TXT length:", (parsed.txt || "").length);
                
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
                
                // Separate srt/txt from the clean JSON object
                const cleanJsonData = { ...parsed };
                delete cleanJsonData.srt;
                delete cleanJsonData.txt;

                setRawTranscript({
                    json: cleanJsonData,
                    srt: parsed.srt || "",
                    txt: parsed.txt || ""
                });
                setActiveTab("json");
                
                console.log("TRANSCRIPT STATE SET - JSON:", !!parsed, "SRT:", (parsed.srt || "").length, "TXT:", (parsed.txt || "").length);
                
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

    const handleDownload = async (jobId: string, format?: "json" | "srt" | "txt") => {
        if (transcript) {
            let content = "";
            let type = "text/plain";
            let ext = "txt";
            
            const targetFormat = format || activeTab;

            if (targetFormat === "json") {
                content = JSON.stringify(transcript.json, null, 2);
                type = "application/json";
                ext = "json";
            } else if (targetFormat === "srt") {
                content = transcript.srt;
                ext = "srt";
            } else if (targetFormat === "txt") {
                content = transcript.txt;
            }

            if (!content) {
                toast.error(`Format ${targetFormat} not generated for this file unfortunately.`);
                return;
            }

            const blob = new Blob([content], { type });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `transcript.${ext}`;
            a.click();
        } else {
            toast.error("No output available to download");
        }
    };

    const handleCopyContent = () => {
        if (transcript) {
            let content = "";
            if (activeTab === "json") {
                content = JSON.stringify(transcript.json, null, 2);
            } else if (activeTab === "srt") {
                content = transcript.srt;
            } else if (activeTab === "txt") {
                content = transcript.txt;
            }

            if (!content) {
                toast.error(`Format ${activeTab} not generated for this file unfortunately.`);
                return;
            }

            navigator.clipboard.writeText(content);
            toast.success(`${activeTab.toUpperCase()} copied to clipboard!`);
        }
    };

    const handleCopyClaudePrompt = () => {
        if (transcript?.json) {
            const job = jobs[0]; // Simple heuristic
            const duration = job?.durationSeconds || 30;
            const prompt = getClaudePrompt(selectedPreset, JSON.stringify(transcript.json), duration);
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
        if (rawTranscript) setRawTranscript(null);
        toast.success("Job removed from history");
    };

    const handleGenerateTSX = async () => {
        if (!transcript?.json) return;

        setIsGenerating(true);
        try {
            // 1. Generate TSX
            const res = await fetch("/api/generate-tsx", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    json: transcript.json,
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
                    <div className="flex items-center">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.refresh()}
                            className="border-white/10"
                        >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Refresh
                        </Button>
                    </div>
                )}
            </div>

                        <div className="flex gap-2 p-1 bg-white/5 w-max rounded-xl mb-6">
                <button 
                  onClick={() => setMainTab("upload")}
                  className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${mainTab === "upload" ? "bg-primary text-white" : "text-white/50 hover:text-white"}`}
                >Upload & Transcribe</button>
                <button 
                  onClick={() => setMainTab("import")}
                  className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${mainTab === "import" ? "bg-primary text-white" : "text-white/50 hover:text-white"}`}
                >Import Transcript</button>
            </div>

            {mainTab === "import" ? (
                <div className="max-w-4xl mx-auto space-y-4">
                    <div className="bg-card/50 border border-white/5 p-8 rounded-3xl">
                        <h3 className="text-xl font-bold mb-2">Import SRT or TXT</h3>
                        <p className="text-muted-foreground text-sm mb-6">Paste your existing transcript here to convert it into the platform's standard JSON format.</p>
                        <textarea 
                            value={importText}
                            onChange={(e) => setImportText(e.target.value)}
                            className="w-full h-64 bg-black/50 border border-white/10 rounded-xl p-4 text-sm font-mono text-white/80 focus:border-primary outline-none resize-none"
                            placeholder="1&#10;00:00:00,000 --> 00:00:02,500&#10;Hello world..."
                        />
                        <Button onClick={handleImport} className="mt-4 w-full h-12 rounded-xl font-bold">
                            Parse & Convert to JSON
                        </Button>
                    </div>
                </div>
            ) : (!isElectron && transcriptionMode === "local" ? (
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
                            <div className="col-span-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-2">
                                    Transcription Mode
                                </label>
                                <div className="flex gap-2 p-1 bg-black/20 border border-white/5 w-full rounded-xl">
                                    <button 
                                        onClick={(e) => { e.preventDefault(); setTranscriptionMode("cloud"); }}
                                        className={`flex-1 px-4 py-3 rounded-lg text-sm font-bold transition-all ${transcriptionMode === "cloud" ? "bg-primary text-white shadow-lg" : "text-white/50 hover:text-white"}`}
                                    >Cloud (Fast)</button>
                                    <button 
                                        onClick={(e) => { e.preventDefault(); setTranscriptionMode("local"); }}
                                        className={`flex-1 px-4 py-3 rounded-lg text-sm font-bold transition-all ${transcriptionMode === "local" ? "bg-primary text-white shadow-lg" : "text-white/50 hover:text-white"}`}
                                    >Local (Desktop)</button>
                                </div>
                            </div>
                            {transcriptionMode === "cloud" && (
                                <div className="col-span-2 border-t border-white/5 pt-4 mt-1 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-2">
                                        Groq API Key (Optional Override)
                                    </label>
                                    <Input
                                        type="password"
                                        value={groqApiKey}
                                        onChange={(e) => handleApiKeyChange(e.target.value)}
                                        placeholder="gsk_..."
                                        className="bg-card/50 border-white/10 h-12 text-white"
                                    />
                                    <p className="text-[10px] text-muted-foreground mt-1">
                                        Enter your own Groq API Key if the default system key is rate-limited or invalid.
                                    </p>
                                </div>
                            )}
                            <div className="col-span-2 sm:col-span-1 border-t border-white/5 pt-4 mt-2">
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

                            <div className="col-span-2 sm:col-span-1 border-t border-white/5 pt-4 mt-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-2">
                                    Language
                                </label>
                                <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                                    <SelectTrigger className="bg-card/50 border-white/10 h-12">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card/90 backdrop-blur-xl border-white/10">
                                        <SelectItem value="auto">Auto Detect</SelectItem>
                                        <SelectItem value="en" className="font-bold text-primary">English (Global)</SelectItem>
                                        <SelectItem value="es" className="text-primary/70">Spanish</SelectItem>
                                        <SelectItem value="fr" className="text-primary/70">French</SelectItem>
                                        <SelectItem value="de" className="text-primary/70">German</SelectItem>
                                        <SelectItem value="hi" className="font-bold text-orange-400">Hindi (Indian)</SelectItem>
                                        <SelectItem value="hinglish" className="text-orange-400">Hinglish</SelectItem>
                                        <SelectItem value="mr" className="text-orange-400">Marathi (Indian)</SelectItem>
                                        <SelectItem value="ta" className="text-orange-400">Tamil (Indian)</SelectItem>
                                        <SelectItem value="te" className="text-orange-400">Telugu (Indian)</SelectItem>
                                        <SelectItem value="bn" className="text-orange-400">Bengali (Indian)</SelectItem>
                                        <SelectItem value="ur" className="text-orange-400">Urdu (Indian)</SelectItem>
                                        <SelectItem value="ml" className="text-orange-400">Malayalam (Indian)</SelectItem>
                                        <SelectItem value="kn" className="text-orange-400">Kannada (Indian)</SelectItem>
                                        <SelectItem value="gu" className="text-orange-400">Gujarati (Indian)</SelectItem>
                                        <SelectItem value="pa" className="text-orange-400">Punjabi (Indian)</SelectItem>
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
                                                            onClick={() => {
                                                                try {
                                                                    const parsedResult = JSON.parse(job.transcriptionOutput || "{}");
                                                                    if (parsedResult.error) {
                                                                        toast.error("No content saved for this job");
                                                                        return;
                                                                    }
                                                                    setRawTranscript({
                                                                        json: parsedResult.json || parsedResult,
                                                                        srt: parsedResult.srt || "",
                                                                        txt: parsedResult.txt || ""
                                                                    });
                                                                    setActiveTab("json");
                                                                } catch(e) { 
                                                                    toast.error("Could not parse legacy job data");
                                                                }
                                                            }}
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

                        {/* Result Section */}
                        <div className="space-y-4">
                            {/* Resegment and Capitalization Controls */}
                            {transcript && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 animate-in fade-in slide-in-from-top-2 duration-300 mb-2">
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-2">
                                            Resegment (Words per chunk)
                                        </label>
                                        <Select 
                                            value={String(resegmentWords)} 
                                            onValueChange={(val) => setResegmentWords(Number(val))}
                                        >
                                            <SelectTrigger className="bg-black/40 border-white/10 h-10 w-full">
                                                <SelectValue placeholder="Original Layout" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-card/90 backdrop-blur-xl border-white/10">
                                                <SelectItem value="0">Original Layout</SelectItem>
                                                <SelectItem value="1">1 Word</SelectItem>
                                                <SelectItem value="2">2 Words</SelectItem>
                                                <SelectItem value="3">3 Words</SelectItem>
                                                <SelectItem value="4">4 Words</SelectItem>
                                                <SelectItem value="5">5 Words</SelectItem>
                                                <SelectItem value="6">6 Words</SelectItem>
                                                <SelectItem value="7">7 Words</SelectItem>
                                                <SelectItem value="8">8 Words</SelectItem>
                                                <SelectItem value="9">9 Words</SelectItem>
                                                <SelectItem value="10">10 Words</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-2">
                                            Letter Capitalization
                                        </label>
                                        <Select 
                                            value={capitalization} 
                                            onValueChange={(val: any) => setCapitalization(val)}
                                        >
                                            <SelectTrigger className="bg-black/40 border-white/10 h-10 w-full">
                                                <SelectValue placeholder="Original Case" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-card/90 backdrop-blur-xl border-white/10">
                                                <SelectItem value="original">Original Case</SelectItem>
                                                <SelectItem value="sentence">Sentence Case</SelectItem>
                                                <SelectItem value="segment">Segment Case</SelectItem>
                                                <SelectItem value="word">Capitalize Each Word</SelectItem>
                                                <SelectItem value="uppercase">ALL CAPS</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            )}

                            {/* Transcription Format Tabs */}
                            <div className="flex items-center justify-between pb-2 mb-4 border-b border-white/5">
                                <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 space-x-1">
                                    <button
                                        onClick={() => setActiveTab("json")}
                                        className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                                            activeTab === "json" ? "bg-white text-black shadow-lg" : "text-white/40 hover:text-white/60 hover:bg-white/5"
                                        }`}
                                    >
                                        JSON
                                    </button>
                                    <button
                                        onClick={() => setActiveTab("srt")}
                                        className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                                            activeTab === "srt" ? "bg-white text-black shadow-lg" : "text-white/40 hover:text-white/60 hover:bg-white/5"
                                        }`}
                                    >
                                        SRT
                                    </button>
                                    <button
                                        onClick={() => setActiveTab("txt")}
                                        className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                                            activeTab === "txt" ? "bg-white text-black shadow-lg" : "text-white/40 hover:text-white/60 hover:bg-white/5"
                                        }`}
                                    >
                                        TXT
                                    </button>
                                </div>
                                {transcript && (
                                    <div className="flex gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleCopyContent}
                                            className="h-8 text-xs"
                                        >
                                            <Copy className="w-3 h-3 mr-1" />
                                            Copy {activeTab.toUpperCase()}
                                        </Button>
                                    </div>
                                )}
                            </div>

                            <div className="relative rounded-2xl bg-[#0A0A0B] border border-white/5 overflow-hidden min-h-[400px]">
                                {transcript ? (
                                    <div className={`p-6 text-sm font-mono text-green-400/80 overflow-auto max-h-[500px]`}>
                                        {activeTab === "json" && (
                                            <pre>{JSON.stringify(transcript.json, null, 2)}</pre>
                                        )}

                                        {activeTab === "srt" && (
                                            <pre style={{ whiteSpace: "pre-wrap" }}>
                                                {transcript.srt || "No SRT data"}
                                            </pre>
                                        )}

                                        {activeTab === "txt" && (
                                          <pre style={{ whiteSpace: "pre-wrap" }}>
                                            {transcript.txt || "No TXT data"}
                                          </pre>
                                        )}
                                    </div>
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                                        <div className="text-center">
                                            <FileJson2 className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                            <p className="text-sm">No transcription yet</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Download Buttons */}
                        {transcript && (
                            <div className="grid grid-cols-3 gap-4">
                                <Button
                                    onClick={() => handleDownload("current", "json")}
                                    className="h-14 rounded-2xl font-black italic text-[14px] tracking-widest uppercase bg-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.5)] border-0 hover:bg-blue-400 hover:scale-105 transition-all"
                                >
                                    <Download className="w-5 h-5 mr-3" />
                                    JSON
                                </Button>
                                <Button
                                    onClick={() => handleDownload("current", "srt")}
                                    className="h-14 rounded-2xl font-black italic text-[14px] tracking-widest uppercase bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.5)] border-0 hover:bg-emerald-400 hover:scale-105 transition-all"
                                >
                                    <Download className="w-5 h-5 mr-3" />
                                    SRT
                                </Button>
                                <Button
                                    onClick={() => handleDownload("current", "txt")}
                                    className="h-14 rounded-2xl font-black italic text-[14px] tracking-widest uppercase bg-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.5)] border-0 hover:bg-purple-400 hover:scale-105 transition-all"
                                >
                                    <Download className="w-5 h-5 mr-3" />
                                    TXT
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
