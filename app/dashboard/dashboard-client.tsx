"use client";

import Link from "next/link";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Filter, MoreVertical, Play, Clock, CheckCircle2, AlertCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateProjectDialog } from "@/components/create-project-dialog";
import { GenerateFullVideoDialog } from "@/components/generate-full-video-dialog";
import { LivePreview } from "@/components/live-preview";
import { Input } from "@/components/ui/input";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { OnboardingWizard } from "@/components/onboarding-wizard";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Project {
    id: string;
    name: string;
    status: string;
    resolution: string;
    fps: number;
    thumbnailUrl?: string | null;
    updatedAt: string;
    createdAt: string;
    latestVersion: {
        id: string;
        title: string | null;
        validated: boolean;
        code?: string;
    } | null;
    _count: {
        versions: number;
        renderJobs: number;
    };
}

interface Stats {
    totalProjects: number;
    totalVersions: number;
    validatedCount: number;
    errorCount: number;
}

interface DashboardClientProps {
    projects: Project[];
    stats: Stats;
    userName: string;
    credits: number;
}

export function DashboardClient({ projects: initialProjects, stats, userName, credits }: DashboardClientProps) {
    const searchParams = useSearchParams();
    const showOnboarding = searchParams.get("new") === "true";
    const router = useRouter();

    const [projects, setProjects] = useState(initialProjects);
    const [searchQuery, setSearchQuery] = useState("");
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<"name" | "updated" | "created">("updated");

    const filteredProjects = projects
        .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a, b) => {
            if (sortBy === "name") return a.name.localeCompare(b.name);
            if (sortBy === "created") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });

    const handleDelete = async (projectId: string) => {
        setIsDeleting(projectId);
        try {
            const res = await fetch(`/api/projects?id=${projectId}`, {
                method: "DELETE",
            });
            if (res.ok) {
                setProjects(prev => prev.filter(p => p.id !== projectId));
                toast.success("Project terminated successfully");
            } else {
                toast.error("Failed to delete project");
            }
        } catch (error) {
            toast.error("Error deleting project");
        }
        setIsDeleting(null);
    };

    const handleProjectCreated = () => {
        router.refresh();
    };

    return (
        <div className="p-8 space-y-8">
            {showOnboarding && <OnboardingWizard />}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight italic">Your <span className="text-primary italic">Productions</span></h1>
                    <p className="text-muted-foreground">Manage and preview your high-end animation studio files.</p>
                </div>
                <div className="flex items-center gap-4">
                    <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 mr-4">
                        <CardContent className="p-3 px-5 flex items-center justify-between gap-6">
                            <div>
                                <p className="text-[10px] font-black uppercase text-primary tracking-widest leading-tight">Credits Available</p>
                                <h3 className="text-2xl font-black italic mt-0">{credits}</h3>
                            </div>
                            <div className="flex flex-col gap-2">
                                <Link href="/billing">
                                    <Button size="sm" variant="default" className="h-7 text-[10px] px-3 font-bold uppercase w-full">Get More</Button>
                                </Link>
                                <Link href="/referrals">
                                    <Button size="sm" variant="outline" className="h-7 text-[10px] px-3 font-bold uppercase w-full border-primary/30 text-primary hover:bg-primary/10">Invite Friends</Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                    <div className="flex flex-col gap-2">
                        <GenerateFullVideoDialog />
                        <CreateProjectDialog onSuccess={handleProjectCreated} />
                    </div>
                </div>
            </div>

            {credits === 0 && (
                <div className="bg-primary/10 border border-primary/20 p-4 rounded-xl flex items-center justify-between">
                    <div>
                        <h4 className="font-bold text-primary">Out of Credits</h4>
                        <p className="text-sm text-primary/80">Invite friends to earn free credits instantly.</p>
                    </div>
                    <Link href="/referrals">
                        <Button className="font-bold uppercase tracking-wider">Earn Credits</Button>
                    </Link>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard title="Total Projects" value={stats.totalProjects.toString()} icon={<Plus className="w-4 h-4" />} />
                <StatCard title="Active Versions" value={stats.totalVersions.toString()} icon={<Clock className="w-4 h-4" />} />
                <StatCard title="Validated" value={stats.validatedCount.toString()} icon={<CheckCircle2 className="w-4 h-4" />} />
                <StatCard title="Errors" value={stats.errorCount.toString()} icon={<AlertCircle className="w-4 h-4 text-destructive" />} trend="danger" />
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search projects..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 bg-card/30 border-white/5 backdrop-blur-xl h-11"
                    />
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="border-white/5 bg-card/50 h-11 font-bold">
                            <Filter className="mr-2 w-4 h-4" /> Sort: {sortBy === "name" ? "Name" : sortBy === "created" ? "Newest" : "Recent"}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-card/90 backdrop-blur-xl border-white/5">
                        <DropdownMenuItem onClick={() => setSortBy("updated")} className="text-xs font-bold uppercase tracking-tight">Recently Updated</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSortBy("created")} className="text-xs font-bold uppercase tracking-tight">Newest First</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSortBy("name")} className="text-xs font-bold uppercase tracking-tight">Alphabetical</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Projects Grid */}
            <div className="columns-1 md:columns-2 lg:columns-3 gap-8 space-y-8">
                {filteredProjects.length === 0 && projects.length === 0 ? (
                    <div className="col-span-full border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center p-12 text-center bg-card/10">
                        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4 border border-white/5">
                            <Plus className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="font-bold text-xl mb-2">No Productions Yet</h3>
                        <p className="text-muted-foreground text-sm max-w-sm mb-6">
                            Create your first animation project to get started with TSX Studio.
                        </p>
                        <CreateProjectDialog onSuccess={handleProjectCreated} />
                    </div>
                ) : (
                    <>
                        {filteredProjects.map((project) => (
                            <ProjectCard
                                key={project.id}
                                project={project}
                                onDelete={handleDelete}
                                isDeleting={isDeleting === project.id}
                            />
                        ))}
                        <div className="break-inside-avoid border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center p-8 text-center bg-card/10 hover:bg-card/20 transition-all cursor-pointer group min-h-[280px]">
                            <CreateProjectDialog onSuccess={handleProjectCreated}>
                                <div className="flex flex-col items-center">
                                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform border border-white/5">
                                        <Plus className="w-6 h-6 text-muted-foreground" />
                                    </div>
                                    <h3 className="font-bold uppercase text-xs tracking-widest">New Production</h3>
                                    <p className="text-[10px] text-muted-foreground uppercase mt-1">Start from scratch or template</p>
                                </div>
                            </CreateProjectDialog>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function StatCard({ title, value, icon, trend = "neutral" }: { title: string, value: string, icon: React.ReactNode, trend?: "neutral" | "danger" }) {
    return (
        <Card className="border-white/5 bg-card/30 backdrop-blur-xl">
            <CardContent className="p-6 flex items-center justify-between">
                <div>
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{title}</p>
                    <h3 className={`text-2xl font-black italic mt-1 ${trend === "danger" && parseInt(value) > 0 ? "text-destructive" : ""}`}>{value}</h3>
                </div>
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-muted-foreground border border-white/5">
                    {icon}
                </div>
            </CardContent>
        </Card>
    );
}

function ProjectCard({ project, onDelete, isDeleting }: { project: Project, onDelete: (id: string) => void, isDeleting: boolean }) {
    const updatedAt = formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true });
    const [imgError, setImgError] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleMouseEnter = () => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = setTimeout(() => setIsHovered(true), 150);
    };

    const handleMouseLeave = () => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        setIsHovered(false);
    };

    const getStatusBadge = (status: string) => {
        switch (status.toLowerCase()) {
            case "ready":
                return <Badge variant="default" className="text-[10px] uppercase font-black tracking-widest px-2 h-5 text-black">Ready</Badge>;
            case "error":
                return <Badge variant="destructive" className="text-[10px] uppercase font-black tracking-widest px-2 h-5">Error</Badge>;
            default:
                return <Badge variant="secondary" className="text-[10px] uppercase font-black tracking-widest px-2 h-5">Draft</Badge>;
        }
    };

    const getResolutionDims = (res: string) => {
        if (!res) return { width: 1080, height: 1920 };
        const lower = res.toLowerCase();
        if (lower.includes('x')) {
            const [w, h] = lower.split('x').map(n => parseInt(n));
            return { width: w || 1080, height: h || 1920 };
        }
        if (lower === '1080p') return { width: 1080, height: 1920 }; // default tall
        if (lower === '4k') return { width: 2160, height: 3840 };    // default tall
        return { width: 1080, height: 1920 };
    };

    const getCodeDims = (code?: string, fallbackRes?: string) => {
        if (!code) return getResolutionDims(fallbackRes || "");
        const widthMatch = code.match(/\b(?:width|widthInPixels)\s*[:=]\s*(\d+)/i);
        const heightMatch = code.match(/\b(?:height|heightInPixels)\s*[:=]\s*(\d+)/i);
        let w = widthMatch ? parseInt(widthMatch[1]) : 0;
        let h = heightMatch ? parseInt(heightMatch[1]) : 0;
        if (w >= 100 && h >= 100) return { width: w, height: h };
        
        // If "1080p" but no code config, assume vertical 1080x1920 since this is TSX Studio norm, 
        // fallback otherwise.
        if (fallbackRes?.toLowerCase() === '1080p') return { width: 1080, height: 1920 };
        return getResolutionDims(fallbackRes || "");
    };

    const cleanCode = (raw?: string) => {
        if (!raw) return "";
        let c = raw.trim();
        if (c.startsWith("```tsx")) c = c.slice(6);
        else if (c.startsWith("```typescript")) c = c.slice(13);
        else if (c.startsWith("```ts")) c = c.slice(5);
        else if (c.startsWith("```javascript")) c = c.slice(13);
        else if (c.startsWith("```js")) c = c.slice(5);
        else if (c.startsWith("```")) c = c.slice(3);
        
        if (c.endsWith("```")) c = c.slice(0, -3);
        return c.trim();
    };

    const actualCode = cleanCode(project.latestVersion?.code);
    const dims = getCodeDims(actualCode, project.resolution);

    return (
        <Card 
            className="group break-inside-avoid relative border border-white/5 bg-black hover:border-primary/20 transition-all duration-300 overflow-hidden rounded-3xl flex flex-col shadow-2xl"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={{ aspectRatio: `${dims.width} / ${dims.height}` }}
        >
            {/* Background image & Live Preview wrapper */}
            {project.thumbnailUrl && !imgError ? (
                <img
                    src={project.thumbnailUrl}
                    alt={project.name}
                    onError={() => setImgError(true)}
                    className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                />
            ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10 opacity-40 group-hover:opacity-80 transition-opacity duration-700">
                    <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)', backgroundSize: '24px 24px' }} />
                </div>
            )}

            {isHovered && actualCode ? (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center bg-black/40 backdrop-blur-[2px] z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                     <LivePreview 
                         code={actualCode} 
                         isValid={true} 
                         width={dims.width} 
                         height={dims.height} 
                         fps={project.fps || 30} 
                         durationInFrames={300} 
                         disableUI={true}
                         autoPlay={true}
                     />
                </div>
            ) : null}
            
            {/* Dark overlay at bottom so text is readable */}
            <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/95 via-black/50 to-transparent pointer-events-none z-10 transition-opacity duration-500 opacity-80 group-hover:opacity-100" />
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/60 to-transparent pointer-events-none z-10 transition-opacity duration-500 opacity-40 group-hover:opacity-80" />

            {/* Play overlay button (centered) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                <div className="w-16 h-16 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center group-hover:scale-125 group-hover:bg-primary/20 transition-all duration-500 shadow-2xl opacity-100 group-hover:opacity-0 transform">
                    <Play className="w-8 h-8 text-white group-hover:text-primary fill-current ml-1 transition-colors" />
                </div>
            </div>

            {/* Top Menu Dropdown */}
            <div className="absolute top-4 right-4 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-black/60 backdrop-blur rounded-full border border-white/5">
                            <MoreVertical className="w-4 h-4 text-white" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-card/90 backdrop-blur-xl border-white/5">
                        <DropdownMenuItem className="text-xs font-bold uppercase tracking-tight">Rename</DropdownMenuItem>
                        <DropdownMenuItem className="text-xs font-bold uppercase tracking-tight">Duplicate</DropdownMenuItem>
                        <DropdownMenuItem
                            className="text-destructive text-xs font-bold uppercase tracking-tight"
                            onClick={() => onDelete(project.id)}
                            disabled={isDeleting}
                        >
                            <Trash2 className="w-3 h-3 mr-2" />
                            {isDeleting ? "Deleting..." : "Delete"}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Content Overlay */}
            <div className="absolute inset-0 z-20 flex flex-col justify-between p-6 cursor-pointer" onClick={() => window.location.href = `/studio/${project.id}`}>
                {/* Header: Status Badge Only */}
                <div className="flex items-start justify-between">
                    {getStatusBadge(project.status)}
                </div>

                {/* Footer: Title, Info, Button */}
                <div className="flex flex-col gap-3 mt-auto transform translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                    <div>
                        <h3 className="text-2xl font-black italic tracking-tighter text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] line-clamp-1">{project.name}</h3>
                        <p className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-white/70 mt-1 drop-shadow-md">
                            <Clock className="w-3 h-3" /> Updated {updatedAt}
                        </p>
                    </div>
                    
                    <div className="flex items-center justify-between opacity-80 group-hover:opacity-100 transition-opacity">
                        <div className="flex gap-3 text-[10px] font-black uppercase tracking-widest text-[#27F2FF] drop-shadow-[0_0_8px_rgba(39,242,255,0.4)]">
                            <span className="bg-black/40 px-2 py-1 rounded backdrop-blur border border-white/5">{project.resolution}</span>
                            <span className="bg-black/40 px-2 py-1 rounded backdrop-blur border border-white/5">{project.fps} FPS</span>
                        </div>
                        
                        <Button size="sm" className="h-9 px-5 bg-white text-black hover:bg-[#27f2ff] hover:text-black rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(0,0,0,0.5)] group-hover:shadow-[0_0_20px_rgba(39,242,255,0.3)]">
                            Open Studio
                        </Button>
                    </div>
                </div>
            </div>
        </Card>
    );
}
