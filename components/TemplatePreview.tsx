"use client";

import React, { useState, useEffect, useRef } from "react";
import { LivePreview } from "./live-preview";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ArrowUpRight, PlayCircle } from "lucide-react";
import { Skeleton } from "./ui/skeleton";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export interface TemplateData {
  name: string;
  description: string;
  tsxCode: string;
  prompt: string;
  duration: number;
  tags: string[];
  width?: number;
  height?: number;
}

interface TemplatePreviewProps {
  template: TemplateData;
}

export function TemplatePreview({ template }: TemplatePreviewProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Lazy Loading via IntersectionObserver (Feature 4)
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Only load once
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleUseTemplate = async () => {
    // Feature 8: Use Template
    // Creates a new project with the template TSX Code
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: template.name,
          code: template.tsxCode,
          fps: 30,
          duration: template.duration,
          width: template.width || 1080,
          height: template.height || 1920
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create project");
      }
      if (data?.id) {
        // Feature 8: Open studio directly
        router.push(`/studio/${data.id}`);
      } else {
        throw new Error("Failed to create project: No ID returned");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to create project");
    }
  };

  return (
    <div
      ref={containerRef}
      className="group relative flex flex-col rounded-3xl border border-white/5 bg-card/30 backdrop-blur-xl overflow-hidden hover:border-primary/20 transition-all duration-300"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Dynamically adjust the container aspect ratio based on template dimensions */}
      <div 
        className="relative bg-black flex items-center justify-center overflow-hidden w-full"
        style={{ aspectRatio: `${template.width || 1080} / ${template.height || 1920}` }}
      >
        {!isVisible ? (
          // Feature 10: Skeleton loader before preview loads
          <Skeleton className="w-full h-full rounded-none" />
        ) : (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
             <LivePreview
               code={template.tsxCode}
               isValid={true}
               width={template.width || 1080}
               height={template.height || 1920}
               durationInFrames={template.duration}
               disableUI={true}
               autoPlay={isHovered}
             />
          </div>
        )}

        {/* Show a dark overlay and play icon when not hovered to indicate interactivity */}
        {!isHovered && isVisible && (
            <div className="absolute inset-0 flex items-center justify-center cursor-pointer pointer-events-none transition-opacity duration-300">
                 <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white/80 group-hover:scale-110 shadow-xl border border-white/10 z-10">
                     <PlayCircle className="w-6 h-6 ml-0.5" />
                 </div>
            </div>
        )}
      </div>

      {/* Feature 7: Template Grid UI Elements */}
      <div className="p-5 flex flex-col gap-3 flex-1">
        <h3 className="font-bold text-lg leading-tight line-clamp-1">{template.name}</h3>
        <p className="text-xs text-muted-foreground line-clamp-2">{template.description}</p>
        
        <div className="flex gap-2 flex-wrap mt-auto pt-2">
          {template.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[10px] uppercase font-black tracking-widest bg-white/5 hover:bg-white/10 border-none px-2 py-0.5">
              {tag}
            </Badge>
          ))}
        </div>

        <Button 
            className="w-full mt-3 font-black uppercase tracking-widest text-[10px] h-10 group-hover:bg-primary group-hover:text-black transition-colors"
            onClick={handleUseTemplate}
        >
            Use Template <ArrowUpRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
