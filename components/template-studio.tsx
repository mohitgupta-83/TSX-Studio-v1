"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { BuiltInTemplate } from "@/lib/template-system/types";
import { TemplateEditorPanel } from "./template-editor";
import { LivePreview } from "./live-preview";
import { Button } from "./ui/button";
import { ChevronLeft, Code2, DownloadCloud, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ExportDialog } from "./export-dialog";
import { getTemplateById } from "@/lib/template-system/registry";

export function TemplateStudio({ templateId }: { templateId: string }) {
    const template = getTemplateById(templateId);

    const router = useRouter();
    const [values, setValues] = useState<Record<string, any>>({});
    const [activeCode, setActiveCode] = useState("");
    const [isExporting, setIsExporting] = useState(false);

    // Initial code generation
    useEffect(() => {
        if (!template) return;

        // Collect defaults immediately
        const defaults = template.schema.fields.reduce((acc, field) => {
            acc[field.id] = field.defaultValue;
            return acc;
        }, {} as Record<string, any>);

        setValues(defaults);
        setActiveCode(template.generateCode(defaults));
    }, [template]);

    if (!template) {
        return <div className="p-8 text-center text-white">Template not found or failed to load.</div>;
    }

    // Update code when values change
    const handleValuesChange = (newValues: Record<string, any>) => {
        setValues(newValues);
        try {
            const code = template.generateCode(newValues);
            setActiveCode(code);
        } catch (e) {
            console.error("Failed to generate template code:", e);
        }
    };

    const handleOpenInEditor = () => {
        // In a real implementation this would create a project in the DB and navigate
        // For now: push to localstorage to transfer it over temporarily
        try {
            localStorage.setItem("tsx_studio_recovered_code", activeCode);
            toast.success("Migrating template to Advanced Editor...");
            setTimeout(() => {
                router.push('/studio/demo');
            }, 1000);
        } catch (e) {
            toast.error("Failed to transfer to editor");
        }
    };

    // Add CSS globally inside the editor to ensure styling matches 100%
    const defaultCss = `
        /* Included in preview implicitly */
        html, body, #root, [data-remotion-wrapper] {
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            text-rendering: optimizeLegibility;
            margin: 0;
            padding: 0;
            background-color: black;
        }
    `;

    return (
        <div className="h-screen w-full flex flex-col bg-[#0A0A0B] text-white overflow-hidden">
            {/* Template Studio Header */}
            <header className="h-16 flex items-center justify-between px-4 border-b border-white/10 shrink-0 bg-black/40 backdrop-blur-xl z-20">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push('/templates')}
                        className="text-muted-foreground hover:text-white"
                    >
                        <ChevronLeft className="w-4 h-4 mr-1" /> Back
                    </Button>
                    <div className="w-[1px] h-6 bg-white/10" />
                    <div className="flex flex-col">
                        <span className="font-semibold text-sm leading-tight flex items-center gap-2">
                            {template.schema.name} <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded-sm bg-primary/20 text-primary">Template</span>
                        </span>
                        <span className="text-xs text-muted-foreground">Visual Editor</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleOpenInEditor}
                        className="bg-zinc-900 border-zinc-800 hover:bg-zinc-800"
                        title="Edit raw TSX code"
                    >
                        <Code2 className="w-4 h-4 mr-2" />
                        Advanced Editing
                    </Button>

                    <Button
                        size="sm"
                        className="bg-white text-black hover:bg-zinc-200 shadow-xl shadow-white/10"
                        onClick={() => setIsExporting(true)}
                    >
                        <DownloadCloud className="w-4 h-4 mr-2" />
                        Render MP4
                    </Button>
                </div>
            </header>

            {/* Split View */}
            <div className="flex-1 flex overflow-hidden relative">

                {/* Left side: Panel */}
                <div className="w-[400px] shrink-0 h-full relative z-10 box-border">
                    <TemplateEditorPanel
                        schema={template.schema}
                        values={values}
                        onChange={handleValuesChange}
                    />
                </div>

                {/* Right side: Preview */}
                <div className="flex-1 h-full relative bg-black/20 overflow-hidden box-border z-[1] flex items-center justify-center p-8">
                    {/* Inject implicit styles like in normal engine */}
                    <style dangerouslySetInnerHTML={{ __html: defaultCss }} />
                    <div className="w-full h-full rounded-2xl overflow-hidden border border-white/5 shadow-2xl relative bg-[#0a0a0c]/50 backdrop-blur">
                        <LivePreview
                            code={activeCode}
                            width={template.schema.width || 1080}
                            height={template.schema.height || 1920}
                            fps={template.schema.fps || 30}
                            durationInFrames={template.schema.durationInFrames || 300}
                            isValid={activeCode.trim().length > 0}
                        />
                    </div>
                </div>
            </div>

            {/* Export Dialog */}
            <ExportDialog
                projectId={`template-${template.id}`}
                versionId="template_export"
                code={activeCode}
                width={template.schema.width || 1080}
                height={template.schema.height || 1920}
                fps={template.schema.fps || 30}
                durationInFrames={template.schema.durationInFrames || 300}
            />

            {/* Hidden toggle for the dialog state since it isn't controlled fully by props right now. 
                In a real app, I'd expose open/onOpenChange in ExportDialogProps to control it programatically.
                For safety, simulating click on the internal trigger.
            */}
            {isExporting && (
                <div className="hidden">
                    <button id="hidden-export-trigger" onClick={() => {
                        const evt = new CustomEvent('open-export-dialog');
                        window.dispatchEvent(evt);
                        setIsExporting(false);
                    }}>Trigger</button>
                </div>
            )}
        </div>
    );
}
