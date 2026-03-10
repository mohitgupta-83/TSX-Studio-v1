"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Rocket,
    Loader2,
    Download,
    Terminal,
    Info,
    ChevronRight,
    CheckCircle,
    X,
    Cpu,
    Zap,
    Settings2,
    Monitor,
    Wallet,
    ShieldCheck
} from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface ExportDialogProps {
    projectId: string;
    versionId: string;
    code: string;
    disabled?: boolean;
    isLoggedIn?: boolean;
    width?: number;
    height?: number;
    fps?: number;
    durationInFrames?: number;
}

export function ExportDialog({
    projectId,
    versionId,
    code,
    disabled = false,
    isLoggedIn = false,
    width = 1080,
    height = 1920,
    fps = 30,
    durationInFrames = 300,
}: ExportDialogProps) {
    const [dialogOpen, setDialogOpen] = useState(false);

    // Listen to global open event (used by templates)
    useEffect(() => {
        const handler = () => setDialogOpen(true);
        window.addEventListener("open-export-dialog", handler);
        return () => window.removeEventListener("open-export-dialog", handler);
    }, []);

    const [isRendering, setIsRendering] = useState(false);
    const [credits, setCredits] = useState<any>(null);
    const [isLoadingCredits, setIsLoadingCredits] = useState(false);
    const router = useRouter();

    // Configuration state
    const [format, setFormat] = useState("MP4 (H.264)");
    const [quality, setQuality] = useState("High (Best)");

    const [isDesktop, setIsDesktop] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined' && (window as any).electronAPI) {
            setIsDesktop(true);
        }
    }, []);

    useEffect(() => {
        if (dialogOpen && isLoggedIn) {
            fetchCredits();
        }
    }, [dialogOpen, isLoggedIn]);

    async function fetchCredits() {
        setIsLoadingCredits(true);
        try {
            const res = await fetch("/api/user/credits");
            if (res.ok) {
                const data = await res.json();
                setCredits(data);
            }
        } catch (error) {
            console.error("Failed to fetch credits", error);
        } finally {
            setIsLoadingCredits(false);
        }
    }

    async function handleStartRender() {
        setIsRendering(true);

        try {
            // 1. Auto-save current state as a new version to ensure DB is synced
            const saveRes = await fetch("/api/versions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectId,
                    code,
                    title: `Render Version (${new Date().toLocaleTimeString() || "Auto"})`,
                }),
            });

            if (!saveRes.ok) {
                console.warn("Auto-save failed before render, proceed with existing version match.");
            }

            const savedVersion = saveRes.ok ? await saveRes.json() : null;
            const finalVersionId = savedVersion?.id || versionId;

            // 2. Create Render Job
            const jobRes = await fetch("/api/render", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectId,
                    versionId: finalVersionId,
                    format,
                    quality,
                    resolution: `${width}x${height}`,
                    fps,
                    durationSeconds: durationInFrames / fps
                }),
            });

            if (!jobRes.ok) {
                throw new Error("Failed to initialize render job");
            }

            const job = await jobRes.json();

            // 2. Trigger Desktop Render if available
            if (isDesktop) {
                // We fire and forget or let it run in background
                (window as any).electronAPI.renderProject({
                    projectId,
                    versionId,
                    code,
                    width,
                    height,
                    fps,
                    durationInFrames,
                    jobId: job.id
                }).catch((err: any) => {
                    console.error("Desktop render trigger error:", err);
                });
            }

            toast.success("Render Started!", {
                description: "Redirecting to exports..."
            });

            // 3. Redirect to /exports
            setTimeout(() => {
                setDialogOpen(false);
                router.push("/exports");
            }, 800);

            // Do NOT close dialog yet, keep showing rendering...
            // setDialogOpen(false); 
        } catch (err: any) {
            toast.error("Render Failed", { description: err.message });
        } finally {
            setIsRendering(false);
        }
    }

    if (disabled) {
        return (
            <Button disabled size="sm" variant="outline" className="gap-2 text-[10px] h-8 font-black uppercase tracking-widest opacity-50">
                <Rocket className="w-3.5 h-3.5" /> Sign in to Export
            </Button>
        );
    }

    return (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
                <Button size="sm" className="gap-2 text-xs h-9 px-5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white border-0 font-bold shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">
                    <Rocket className="w-4 h-4" /> EXPORT VIDEO
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[520px] bg-[#0A0A0B] border-white/10 text-white overflow-hidden shadow-2xl rounded-[32px] p-0 gap-0">
                <div className="p-8 space-y-8">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                        <div className="space-y-2">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-500/10 rounded-xl">
                                    <Zap className="w-6 h-6 text-emerald-400" />
                                </div>
                                <h2 className="text-2xl font-black italic tracking-tight uppercase">
                                    {isDesktop ? "Export Configuration" : "Desktop Required"}
                                </h2>
                            </div>
                            <p className="text-sm text-white/40 font-medium">
                                {isDesktop ? "Configure your video render settings." : "High-performance rendering is only available on our Desktop App."}
                            </p>
                        </div>
                    </div>

                    {!isDesktop ? (
                        <div className="bg-white/5 border border-white/10 rounded-[32px] p-8 text-center space-y-6">
                            <div className="w-20 h-20 bg-gradient-to-br from-emerald-500/20 to-blue-500/20 rounded-3xl mx-auto flex items-center justify-center">
                                <Monitor className="w-10 h-10 text-emerald-400" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold text-white">Unlock Professional Rendering</h3>
                                <p className="text-sm text-white/40 leading-relaxed">
                                    To maintain the highest quality and zero-latency exports, video rendering is processed locally on your hardware.
                                </p>
                            </div>
                            <Button
                                onClick={() => window.open('/download', '_blank')}
                                className="w-full h-14 bg-white text-black hover:bg-neutral-200 font-black italic rounded-2xl transition-all active:scale-95"
                            >
                                DOWNLOAD DESKTOP APP
                            </Button>
                        </div>
                    ) : (
                        <>
                            {/* Form Grid */}
                            <div className="grid grid-cols-1 gap-6">
                                {/* Resolution Display (Static for now) */}
                                <div className="space-y-3">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-white/30">Dimensions</Label>
                                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Monitor className="w-4 h-4 text-white/40" />
                                            <span className="text-sm font-bold text-white/60">Dimensions:</span>
                                        </div>
                                        <span className="text-sm font-black text-emerald-400 font-mono italic">{width}x{height}</span>
                                    </div>
                                </div>

                                {/* Format & Quality */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-3">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-white/30">Format</Label>
                                        <Select value={format} onValueChange={setFormat}>
                                            <SelectTrigger className="h-14 bg-white/5 border-white/10 rounded-2xl focus:ring-emerald-500/20 font-bold">
                                                <SelectValue placeholder="Select Format" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-[#0F0F11] border-white/10 text-white rounded-xl">
                                                <SelectItem value="MP4 (H.264)" className="focus:bg-emerald-500/10 focus:text-emerald-400 font-medium">MP4 (H.264)</SelectItem>
                                                <SelectItem value="MOV (ProRes)" className="focus:bg-emerald-500/10 focus:text-emerald-400 font-medium">MOV (ProRes)</SelectItem>
                                                <SelectItem value="WEBM" className="focus:bg-emerald-500/10 focus:text-emerald-400 font-medium">WEBM (Alpha)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-3">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-white/30">Quality</Label>
                                        <Select value={quality} onValueChange={setQuality}>
                                            <SelectTrigger className="h-14 bg-white/5 border-white/10 rounded-2xl focus:ring-emerald-500/20 font-bold">
                                                <SelectValue placeholder="Select Quality" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-[#0F0F11] border-white/10 text-white rounded-xl">
                                                <SelectItem value="Low (Fast)" className="focus:bg-emerald-500/10 focus:text-emerald-400 font-medium">Low (Fast)</SelectItem>
                                                <SelectItem value="High (Best)" className="focus:bg-emerald-500/10 focus:text-emerald-400 font-medium">High (Best)</SelectItem>
                                                <SelectItem value="Ultra (4K)" className="focus:bg-emerald-500/10 focus:text-emerald-400 font-medium">Ultra (4K)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Credits Section */}
                                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-[28px] p-6 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                                                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-white">Estimated Cost: 0 Credit(s)</h4>
                                                <p className="text-[10px] text-emerald-400/60 font-medium">Your Balance: Unlimited Credits</p>
                                            </div>
                                        </div>
                                        <Wallet className="w-5 h-5 text-emerald-500/20" />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer Actions */}
                {isDesktop && (
                    <div className="p-8 bg-white/[0.02] border-t border-white/5 flex gap-4">
                        <Button
                            variant="ghost"
                            className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-white/5 text-white/50 hover:text-white"
                            onClick={() => setDialogOpen(false)}
                        >
                            Close
                        </Button>
                        <Button
                            className="flex-[1.5] h-14 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-black italic rounded-2xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50"
                            onClick={handleStartRender}
                            disabled={isRendering}
                        >
                            {isRendering ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                    STARTING...
                                </>
                            ) : (
                                <>
                                    <Rocket className="w-5 h-5 mr-3" />
                                    RENDER VIDEO
                                </>
                            )}
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
