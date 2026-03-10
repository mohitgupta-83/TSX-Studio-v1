"use client";

import React, { useEffect } from "react";
import { TemplateSchema, TemplateField } from "@/lib/template-system/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RefreshCcw } from "lucide-react";

interface TemplateEditorProps {
    schema: TemplateSchema;
    values: Record<string, any>;
    onChange: (values: Record<string, any>) => void;
}

export function TemplateEditorPanel({ schema, values, onChange }: TemplateEditorProps) {
    // Initialize default values on mount
    useEffect(() => {
        const defaults = schema.fields.reduce((acc, field) => {
            if (values[field.id] === undefined && field.defaultValue !== undefined) {
                acc[field.id] = field.defaultValue;
            }
            return acc;
        }, {} as Record<string, any>);

        if (Object.keys(defaults).length > 0) {
            onChange({ ...values, ...defaults });
        }
    }, [schema]);

    const handleChange = (id: string, val: any) => {
        onChange({ ...values, [id]: val });
    };

    const handleReset = () => {
        const defaults = schema.fields.reduce((acc, field) => {
            acc[field.id] = field.defaultValue;
            return acc;
        }, {} as Record<string, any>);
        onChange(defaults);
    };

    const renderField = (field: TemplateField) => {
        const value = values[field.id] !== undefined ? values[field.id] : field.defaultValue;

        switch (field.type) {
            case "text":
                return (
                    <Input
                        value={value || ""}
                        onChange={(e) => handleChange(field.id, e.target.value)}
                        placeholder={field.placeholder || "Enter text..."}
                        className="bg-white/5 border-white/10"
                    />
                );
            case "textarea":
                return (
                    <Textarea
                        value={value || ""}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleChange(field.id, e.target.value)}
                        placeholder={field.placeholder || "Enter text..."}
                        className="bg-white/5 border-white/10 resize-none h-24"
                    />
                );
            case "color":
                return (
                    <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 rounded-md overflow-hidden border border-white/10 shrink-0">
                            <input
                                type="color"
                                value={value || "#ffffff"}
                                onChange={(e) => handleChange(field.id, e.target.value)}
                                className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer"
                            />
                        </div>
                        <Input
                            value={value || "#ffffff"}
                            onChange={(e) => handleChange(field.id, e.target.value)}
                            className="bg-white/5 border-white/10 uppercase"
                        />
                    </div>
                );
            case "number":
                return (
                    <Input
                        type="number"
                        min={field.min}
                        max={field.max}
                        step={field.step || 1}
                        value={value || 0}
                        onChange={(e) => handleChange(field.id, parseFloat(e.target.value))}
                        className="bg-white/5 border-white/10"
                    />
                );
            case "slider":
                return (
                    <div className="py-3">
                        <Slider
                            min={field.min || 0}
                            max={field.max || 100}
                            step={field.step || 1}
                            value={[value || field.min || 0]}
                            onValueChange={(vals: number[]) => handleChange(field.id, vals[0])}
                        />
                        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                            <span>{field.min}</span>
                            <span className="font-mono text-white">{value}</span>
                            <span>{field.max}</span>
                        </div>
                    </div>
                );
            case "select":
                return (
                    <Select value={value || ""} onValueChange={(val) => handleChange(field.id, val)}>
                        <SelectTrigger className="bg-white/5 border-white/10">
                            <SelectValue placeholder="Select an option" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#121215] border-white/10">
                            {field.options?.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                );
            default:
                return (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm">
                        Unsupported field type: {field.type}
                    </div>
                );
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#0A0A0B] border-r border-white/10 overflow-hidden">
            <div className="p-5 border-b border-white/10 flex items-center justify-between shrink-0 bg-black/20">
                <div>
                    <h2 className="text-lg font-bold text-white tracking-tight">{schema.name}</h2>
                    <p className="text-xs text-muted-foreground mt-1 max-w-[200px] truncate">{schema.description}</p>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleReset}
                    title="Reset to defaults"
                    className="h-8 w-8 text-muted-foreground hover:text-white hover:bg-white/10"
                >
                    <RefreshCcw className="w-4 h-4" />
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
                {schema.fields.map((field) => (
                    <div key={field.id} className="space-y-2">
                        <Label className="text-sm font-semibold text-white/90">
                            {field.label}
                        </Label>
                        {field.description && (
                            <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed pb-1">
                                {field.description}
                            </p>
                        )}
                        {renderField(field)}
                    </div>
                ))}
            </div>
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                }
                .custom-scrollbar:hover::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.2);
                }
            `}</style>
        </div>
    );
}
