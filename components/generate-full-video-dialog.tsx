"use client";

import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Clapperboard, CheckCircle2, Mic } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { generateFullVideoPipeline } from "@/lib/full-video-engine/pipeline";
import { SceneStyle } from "@/lib/full-video-engine/sceneGenerator";

const SCRIPT_TEMPLATES = {
    // Basic templates
    motivation: "Most people fail because they stop trying. Success comes when you refuse to give up. Keep pushing forward.",
    story: "Once upon a time, there was an idea. It started small. But with consistency, it grew into something unstoppable.",
    viral: "This one simple habit will change your life. Start doing it today, and watch your results multiply."
};

interface FinalResult {
    projectId: string;
}

export function GenerateFullVideoDialog() {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState<"input" | "generating" | "done">("input");
    
    // Inputs
    const [script, setScript] = useState(SCRIPT_TEMPLATES.motivation);
    const [captionStyle, setCaptionStyle] = useState("tiktok");
    const [sceneStyle, setSceneStyle] = useState<SceneStyle>("gradient_motion");

    const [loadingStage, setLoadingStage] = useState("");

    const handleGenerate = async () => {
        if (!script) return toast.error("Script cannot be empty");
        
        const electron = typeof window !== 'undefined' && (window as any).electronAPI;
        if (!electron) {
            toast.error("Auto generation requires the TSX Studio Desktop app.", {
                action: { label: "Download", onClick: () => window.location.href = '/download' }
            });
            return;
        }

        setStep("generating");

        try {
            // STEP 1: PIPELINE (Captions + Background)
            setLoadingStage("Generating captions and visuals...");
            
            // Estimate duration based on roughly 140 words per minute
            const wordCount = script.split(" ").length;
            const estimatedDuration = Math.max(wordCount * 0.43, 3); // min 3 seconds
            
            const finalTsx = await generateFullVideoPipeline(script, captionStyle, sceneStyle, estimatedDuration);

            // STEP 3: CREATE PROJECT
            setLoadingStage("Building Studio project...");
            const res = await fetch("/api/projects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: "AI Generated Video",
                    resolution: "1080p",
                    fps: 30,
                    thumbnailUrl: null,
                })
            });

            if (!res.ok) throw new Error("Failed to create project");
            const newProject = await res.json();

            // SAVE RSX CODE AS VERSION
            const verRes = await fetch(`/api/projects/${newProject.id}/versions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: "Generated Version",
                    code: finalTsx,
                })
            });

            if (!verRes.ok) throw new Error("Failed to attach TSX code to project");

            setLoadingStage("done");
            setStep("done");
            router.push(`/studio/${newProject.id}`);
            setOpen(false);

        } catch (error: any) {
            toast.error(error.message || "Generation failed");
            setStep("input");
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="font-bold uppercase tracking-widest bg-gradient-to-r from-purple-500 to-primary text-white shadow-xl hover:shadow-primary/30 h-11">
                    <Clapperboard className="w-4 h-4 mr-2" /> 1-Click Auto Video
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl bg-[#0A0A0B] border-white/10">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 uppercase tracking-widest font-black italic text-primary">
                        <Clapperboard className="w-5 h-5" /> Auto-Generator Pipeline
                    </DialogTitle>
                </DialogHeader>

                {step === "input" && (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Script / Idea</label>
                            <Textarea 
                                className="resize-none h-24 bg-white/5" 
                                value={script} 
                                onChange={(e) => setScript(e.target.value)} 
                            />
                            <div className="flex gap-2 text-xs">
                                <span className="text-muted-foreground mr-1">Templates:</span>
                                {Object.keys(SCRIPT_TEMPLATES).map((tmpl) => (
                                    <button 
                                        key={tmpl}
                                        onClick={() => setScript(SCRIPT_TEMPLATES[tmpl as keyof typeof SCRIPT_TEMPLATES])}
                                        className="text-primary hover:underline capitalize"
                                    >
                                        {tmpl}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Caption Theme</label>
                                <select 
                                    value={captionStyle} 
                                    onChange={(e) => setCaptionStyle(e.target.value)}
                                    className="w-full h-9 bg-white/5 rounded-md px-3 text-sm focus:outline-none"
                                >
                                    <option value="tiktok">TikTok Dynamic</option>
                                    <option value="clean">Clean & Minimal</option>
                                    <option value="neon">Neon Glow</option>
                                    <option value="mrbeast">MrBeast Pop</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Scene Visuals</label>
                            <select 
                                value={sceneStyle} 
                                onChange={(e) => setSceneStyle(e.target.value as SceneStyle)}
                                className="w-full h-9 bg-white/5 rounded-md px-3 text-sm focus:outline-none"
                            >
                                <option value="gradient_motion">Gradient Motion</option>
                                <option value="dark_cinematic">Dark Cinematic</option>
                                <option value="light_minimal">Light Minimal</option>
                                <option value="abstract_animation">Abstract Animation</option>
                            </select>
                        </div>

                        <Button 
                            className="w-full h-12 uppercase font-black tracking-widest mt-4 bg-gradient-to-r from-purple-500 to-primary"
                            onClick={handleGenerate}
                        >
                            <Clapperboard className="w-4 h-4 mr-2" /> Launch Pipeline
                        </Button>
                    </div>
                )}

                {step === "generating" && (
                    <div className="h-64 flex flex-col items-center justify-center space-y-6">
                        <Loader2 className="w-10 h-10 animate-spin text-primary" />
                        <div className="space-y-2 text-center">
                            <h3 className="text-xl font-bold uppercase italic tracking-widest">Building Video...</h3>
                            <p className="text-muted-foreground font-mono text-xs">{loadingStage}</p>
                        </div>
                    </div>
                )}

                {step === "done" && (
                    <div className="h-64 flex flex-col items-center justify-center space-y-6">
                        <CheckCircle2 className="w-12 h-12 text-green-500" />
                        <h3 className="text-xl font-bold uppercase italic tracking-widest">Video Ready!</h3>
                        <p className="text-muted-foreground text-sm">Opening Studio environment...</p>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
