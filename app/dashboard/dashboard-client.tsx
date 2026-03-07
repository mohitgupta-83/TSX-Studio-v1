"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Filter, MoreVertical, Play, Clock, CheckCircle2, AlertCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateProjectDialog } from "@/components/create-project-dialog";
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
                    <CreateProjectDialog onSuccess={handleProjectCreated} />
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
                        <div className="border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center p-8 text-center bg-card/10 hover:bg-card/20 transition-all cursor-pointer group min-h-[280px]">
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

    return (
        <Card className="group border-white/5 bg-card/30 backdrop-blur-xl hover:border-primary/20 transition-all duration-300 overflow-hidden rounded-3xl">
            <div className="aspect-video bg-neutral-900 relative flex items-center justify-center group-hover:bg-neutral-800 transition-colors overflow-hidden">
                {project.thumbnailUrl && !imgError ? (
                    <img
                        src={project.thumbnailUrl}
                        alt={project.name}
                        onError={() => setImgError(true)}
                        className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                    />
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10 opacity-40 group-hover:opacity-60 transition-opacity">
                        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)', backgroundSize: '24px 24px' }} />
                    </div>
                )}
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-black/40 rounded-full">
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
                <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform shadow-2xl">
                    <Play className="w-7 h-7 text-primary fill-current ml-1" />
                </div>
            </div>
            <CardHeader className="p-6">
                <div className="flex items-center justify-between mb-2">
                    <CardTitle className="text-xl font-bold italic tracking-tight">{project.name}</CardTitle>
                    {getStatusBadge(project.status)}
                </div>
                <CardDescription className="flex items-center gap-2 text-xs font-medium">
                    <Clock className="w-3 h-3" /> Updated {updatedAt}
                </CardDescription>
            </CardHeader>
            <CardFooter className="px-6 pb-6 pt-0 flex items-center justify-between">
                <div className="flex gap-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    <span>{project.resolution}</span>
                    <span>{project.fps} FPS</span>
                </div>
                <Link href={`/studio/${project.id}`}>
                    <Button size="sm" variant="outline" className="h-9 px-4 border-white/10 hover:border-primary hover:text-primary rounded-xl font-bold transition-all">
                        Open Studio
                    </Button>
                </Link>
            </CardFooter>
        </Card>
    );
}
