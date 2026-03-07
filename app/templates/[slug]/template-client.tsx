"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, TrendingUp, User, Tag, ArrowRight } from "lucide-react";

export function TemplateClient({ template, autoUse }: { template: any, autoUse?: boolean }) {
    const [isUsing, setIsUsing] = useState(false);
    const router = useRouter();
    const { data: session, status } = useSession();

    const handleUseTemplate = async () => {
        if (status === "unauthenticated") {
            // Redirect to login/signup, preserve intention
            sessionStorage.setItem("intended_template_use", template.slug);
            router.push(`/login?callbackUrl=/templates/${template.slug}?action=use`);
            return;
        }

        if (status === "loading") return; // Wait for session

        setIsUsing(true);
        toast.loading("Setting up your workspace...", { id: "use-template" });

        try {
            const res = await fetch(`/api/templates/${template.slug}/use`, {
                method: "POST"
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to use template");

            toast.success("Template loaded!", { id: "use-template" });
            router.push(`/studio/${data.projectId}`);
        } catch (error: any) {
            toast.error(error.message, { id: "use-template" });
            setIsUsing(false);
        }
    };

    useEffect(() => {
        if (autoUse && status === "authenticated" && !isUsing) {
            handleUseTemplate();
        }
    }, [autoUse, status]);

    return (
        <div className="min-h-screen bg-[#0A0A0B] text-white">
            {/* Navbar space... simple padding */}
            <div className="pt-24 pb-12 px-6 max-w-6xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* Left Column: Video Preview */}
                    <div className="relative aspect-[9/16] bg-black/50 rounded-[32px] border border-white/10 overflow-hidden flex items-center justify-center shadow-2xl">
                        {template.previewVideoUrl ? (
                            <video
                                src={template.previewVideoUrl}
                                className="w-full h-full object-cover"
                                autoPlay
                                muted
                                loop
                                playsInline
                            />
                        ) : (
                            <div className="absolute flex items-center justify-center flex-col text-white/20">
                                <Play className="w-16 h-16 mb-4" />
                                <p className="font-bold tracking-widest uppercase">No Preview</p>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Template Info */}
                    <div className="flex flex-col justify-center space-y-8">
                        <div className="space-y-4">
                            <div className="flex flex-wrap gap-2">
                                <Badge className="bg-primary/20 text-primary border-none uppercase tracking-widest text-[10px] font-black font-mono">
                                    {template.category}
                                </Badge>
                                {template.tags.split(",").map((tag: string) => (
                                    <Badge key={tag} variant="outline" className="border-white/10 text-muted-foreground uppercase tracking-widest text-[10px] font-black font-mono flex items-center gap-1">
                                        <Tag className="w-3 h-3" /> {tag.trim()}
                                    </Badge>
                                ))}
                            </div>

                            <h1 className="text-5xl md:text-6xl font-black italic uppercase tracking-tighter">
                                {template.name || template.title}
                            </h1>

                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center overflow-hidden border border-white/10">
                                        {template.author.image ? (
                                            <img src={template.author.image} alt={template.author.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="w-4 h-4" />
                                        )}
                                    </div>
                                    <span className="font-bold text-white tracking-wide uppercase text-xs">{template.author.name}</span>
                                </div>
                                <div className="flex items-center gap-1 text-primary italic font-bold text-xs uppercase tracking-widest">
                                    <TrendingUp className="w-4 h-4 mr-1" />
                                    {template.usesCount.toLocaleString()} Uses
                                </div>
                            </div>
                        </div>

                        <p className="text-lg text-white/70 leading-relaxed font-medium">
                            {template.description}
                        </p>

                        <div className="pt-8 border-t border-white/10">
                            <Button
                                onClick={handleUseTemplate}
                                className="w-full sm:w-auto h-14 px-8 text-lg font-black uppercase italic tracking-widest gap-2"
                                disabled={isUsing}
                            >
                                {isUsing ? "Loading Workspace..." : "Use This Template"} <ArrowRight className="w-5 h-5" />
                            </Button>
                            <p className="text-xs text-muted-foreground mt-4 font-medium italic">
                                Get started instantly. No credit card required.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
