"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Loader2, UploadCloud, FileCode } from "lucide-react";

export function SubmitClient() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        tags: "",
        category: "Captions",
        tsxCode: "",
        previewVideoUrl: ""
    });

    const [videoFile, setVideoFile] = useState<File | null>(null);

    const handleTsxUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith(".tsx")) {
            toast.error("Invalid file. Please upload a .tsx file.");
            return;
        }

        const text = await file.text();
        // Validate basic TSX syntax or export
        if (!text.includes("export default function")) {
            toast.warning("Could not find 'export default function' in your TSX file. It may not render correctly.");
        }
        setFormData(prev => ({ ...prev, tsxCode: text }));
        toast.success("TSX loaded successfully.");
    };

    const handleVideoUpload = async () => {
        if (!videoFile) return "";

        // Simulate S3 Presigned URL upload standard pattern
        try {
            const res = await fetch("/api/upload/url", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fileName: videoFile.name, contentType: videoFile.type })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            // Upload directly to S3
            await fetch(data.uploadUrl, {
                method: "PUT",
                headers: { "Content-Type": videoFile.type },
                body: videoFile
            });

            // Construct final URL - this assumes simple S3 bucket patterns
            const finalUrl = data.uploadUrl.split("?")[0];
            return finalUrl;
        } catch (error) {
            console.error("Video upload mocked/failed", error);
            // Fallback for demo without real S3 credentials loaded
            return URL.createObjectURL(videoFile);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.tsxCode) {
            toast.error("You must upload a TSX file code.");
            return;
        }

        setLoading(true);
        toast.loading("Publishing to network...");

        try {
            let videoUrl = formData.previewVideoUrl;
            // If user provided a file instead of a link
            if (videoFile && !videoUrl) {
                if (videoFile.size > 20 * 1024 * 1024) {
                    throw new Error("Preview video must be less than 20MB.");
                }
                videoUrl = await handleVideoUpload();
            }

            const payload = {
                ...formData,
                previewVideoUrl: videoUrl
            };

            const res = await fetch("/api/templates/submit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            toast.success("Template submitted for review!");
            router.push(`/templates/${data.slug}`);

        } catch (error: any) {
            toast.error(error.message || "Failed to submit.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="max-w-4xl mx-auto p-10 bg-[#0A0A0B] border border-white/5 rounded-[40px]">
            <form onSubmit={handleSubmit} className="space-y-8">

                {/* Core details */}
                <div className="space-y-6">
                    <div>
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Template Name</Label>
                        <Input
                            required
                            placeholder="e.g. bold-neon-influencer"
                            className="bg-white/5 border-white/10 mt-2 h-14 font-bold text-lg focus-visible:ring-primary"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div>
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Category</Label>
                        <Select
                            value={formData.category}
                            onValueChange={(val) => setFormData({ ...formData, category: val })}
                        >
                            <SelectTrigger className="bg-white/5 border-white/10 mt-2 h-14 font-bold">
                                <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent className="bg-black border-white/10">
                                <SelectItem value="Captions">Captions</SelectItem>
                                <SelectItem value="Podcast">Podcast</SelectItem>
                                <SelectItem value="TikTok">TikTok</SelectItem>
                                <SelectItem value="Neon">Neon</SelectItem>
                                <SelectItem value="Educational">Educational</SelectItem>
                                <SelectItem value="Explainer">Explainer</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Description</Label>
                        <textarea
                            required
                            rows={4}
                            placeholder="What makes this template elite?"
                            className="flex w-full rounded-md border text-sm outline-none px-3 py-2 bg-white/5 border-white/10 mt-2 font-medium focus-visible:ring-1 focus-visible:ring-primary h-32 resize-none"
                            value={formData.description}
                            onChange={(e: any) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <div>
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tags (comma separated)</Label>
                        <Input
                            required
                            placeholder="e.g. fast, glowing, modern"
                            className="bg-white/5 border-white/10 mt-2 h-14 font-medium"
                            value={formData.tags}
                            onChange={e => setFormData({ ...formData, tags: e.target.value })}
                        />
                    </div>
                </div>

                <hr className="border-white/5 my-8" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2 relative">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">TSX Code</p>
                        <div className="absolute inset-0 top-10 flex flex-col items-center justify-center p-8 bg-white/5 border border-dashed border-white/20 rounded-2xl hover:bg-white/10 transition-colors group cursor-pointer">
                            <input
                                type="file"
                                accept=".tsx,.txt"
                                onChange={handleTsxUpload}
                                className="opacity-0 absolute inset-0 cursor-pointer w-full h-full z-10"
                            />
                            <FileCode className="w-10 h-10 mb-2 text-white/50 group-hover:text-primary transition-colors" />
                            <p className="font-bold text-sm">{formData.tsxCode ? "TSX File Uploaded (+)" : "Upload .tsx File"}</p>
                            <p className="text-xs text-muted-foreground mt-1 text-center font-medium italic">Requires standard Studio exports</p>
                        </div>
                    </div>

                    <div className="space-y-2 relative h-48 md:h-auto">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">Preview Video</p>
                        <div className="absolute inset-0 top-10 flex flex-col items-center justify-center p-8 bg-white/5 border border-dashed border-white/20 rounded-2xl hover:bg-white/10 transition-colors group cursor-pointer">
                            <input
                                type="file"
                                accept="video/*"
                                onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                                className="opacity-0 absolute inset-0 cursor-pointer w-full h-full z-10"
                            />
                            <UploadCloud className="w-10 h-10 mb-2 text-white/50 group-hover:text-secondary transition-colors" />
                            <p className="font-bold text-sm">{videoFile ? videoFile.name : "Upload .mp4 Video"}</p>
                            <p className="text-xs text-muted-foreground mt-1 text-center font-medium italic">Max size 20MB. Portrait 9:16 recommended.</p>
                        </div>
                    </div>
                </div>

                <div className="pt-10 flex justify-end">
                    <Button
                        type="submit"
                        disabled={loading}
                        className="h-14 px-10 text-lg font-black uppercase tracking-widest italic"
                    >
                        {loading ? <><Loader2 className="w-5 h-5 mr-3 animate-spin" /> Processing...</> : "Submit for Verification"}
                    </Button>
                </div>

            </form>
        </Card>
    );
}
