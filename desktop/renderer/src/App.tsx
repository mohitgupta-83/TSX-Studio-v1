import React, { useState, useEffect } from 'react';
import { 
    Plus, 
    Search, 
    Filter, 
    Play, 
    Clock, 
    CheckCircle2, 
    AlertCircle, 
    Zap, 
    Layout, 
    ExternalLink,
    Wand2,
    Sparkles,
    Shield,
    CreditCard,
    Home,
    Video,
    Mic,
    Laptop,
    Trash2,
    ChevronRight,
    MonitorPlay
} from 'lucide-react';
import { Studio } from './Studio';
import { CINEMATIC_REVEAL } from './templates';

// --- Types ---
interface Project {
    id: string;
    name: string;
    status: string;
    resolution: string;
    fps: number;
    updatedAt: string;
    createdAt: string;
    code: string;
}

const App: React.FC = () => {
    const [view, setView] = useState<'dashboard' | 'studio' | 'transcribe'>('dashboard');
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [credits, setCredits] = useState(0);

    // Initial load
    useEffect(() => {
        const stored = localStorage.getItem('tsx-local-projects');
        if (stored) {
            setProjects(JSON.parse(stored));
        } else {
            const defaultProject: Project = {
                id: 'default-1',
                name: 'New Script Template',
                status: 'Draft',
                resolution: '1080p',
                fps: 30,
                updatedAt: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                code: CINEMATIC_REVEAL
            };
            setProjects([defaultProject]);
            localStorage.setItem('tsx-local-projects', JSON.stringify([defaultProject]));
        }
    }, []);

    const createProject = () => {
        const name = prompt("Project Name:", "New Production");
        if (!name) return;
        const newProject: Project = {
            id: Math.random().toString(36).substr(2, 9),
            name,
            status: 'Draft',
            resolution: '1080p',
            fps: 30,
            updatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            code: CINEMATIC_REVEAL
        };
        const updated = [newProject, ...projects];
        setProjects(updated);
        localStorage.setItem('tsx-local-projects', JSON.stringify(updated));
    };

    const deleteProject = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm("Delete this production?")) {
            const updated = projects.filter(p => p.id !== id);
            setProjects(updated);
            localStorage.setItem('tsx-local-projects', JSON.stringify(updated));
        }
    };

    const openProject = (project: Project) => {
        setSelectedProject(project);
        setView('studio');
    };

    if (view === 'studio' && selectedProject) {
        return <Studio project={selectedProject} onBack={() => { setView('dashboard'); setSelectedProject(null); }} />;
    }

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-blue-500/30 flex overflow-hidden">
            {/* Sidebar Overlay (Glassmorphism) */}
            <aside className="w-64 border-r border-white/5 bg-black/40 backdrop-blur-xl flex flex-col p-6 space-y-8 z-50">
                <div className="flex items-center gap-3 px-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <Zap className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-black italic tracking-tighter uppercase leading-none">TSX STUDIO</h1>
                        <p className="text-[8px] text-muted-foreground uppercase font-black tracking-widest mt-1 opacity-50">Desktop Pro</p>
                    </div>
                </div>

                <nav className="flex-1 space-y-2">
                    <NavItem icon={<Home className="w-4 h-4" />} label="Dashboard" active={view === 'dashboard'} onClick={() => setView('dashboard')} />
                    <NavItem icon={<Mic className="w-4 h-4" />} label="Transcribe" onClick={() => alert('Local Transcription Engine is initializing...')} />
                    <NavItem icon={<Layout className="w-4 h-4 text-white/40" />} label="Marketplace" disabled />
                    <NavItem icon={<Clock className="w-4 h-4 text-white/40" />} label="Exports" disabled />
                </nav>

                <div className="pt-6 border-t border-white/5 space-y-2">
                    <div className="px-4 py-3 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between group cursor-default">
                        <div>
                            <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest leading-none">Local Engine</p>
                            <p className="text-[10px] font-bold text-green-400 mt-2 flex items-center gap-1.5 lowercase tracking-tight">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                production ready
                            </p>
                        </div>
                        <Laptop className="w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors" />
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 relative overflow-auto bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.05),transparent)]">
                <div className="p-10 max-w-6xl mx-auto space-y-12">
                    {/* Global Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-1">
                            <h1 className="text-4xl font-black italic tracking-tighter uppercase leading-none">Your <span className="text-blue-500">Productions</span></h1>
                            <p className="text-sm text-muted-foreground font-medium pt-2">Manage and preview your high-end animation studio files.</p>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* Credits Component */}
                            <div className="bg-white/[0.03] border border-white/10 rounded-[28px] p-4 px-6 flex items-center gap-8 backdrop-blur-md">
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black uppercase text-blue-400 tracking-[0.2em] leading-none">Credits Available</p>
                                    <h3 className="text-2xl font-black italic">{credits}</h3>
                                </div>
                                <div className="h-10 w-[1px] bg-white/10" />
                                <div className="flex flex-col gap-1.5">
                                    <button className="h-7 px-4 bg-white text-black text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-neutral-200 transition-colors">Get More</button>
                                    <button className="h-7 px-4 bg-transparent border border-white/10 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-white/5 transition-colors">Invite Friends</button>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <button className="h-11 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all flex items-center gap-2">
                                    <Zap className="w-3.5 h-3.5 fill-current" /> 1-Click Auto Video
                                </button>
                                <button onClick={createProject} className="h-11 px-6 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-neutral-200 transition-all flex items-center justify-center gap-2 shadow-lg">
                                    <Plus className="w-4 h-4" /> Create Project
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Earn Credits Banner */}
                    <div className="bg-blue-600/10 border border-blue-500/20 p-6 rounded-[32px] flex items-center justify-between relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="z-10 flex items-center gap-6">
                            <div className="w-14 h-14 rounded-2xl bg-blue-500/15 flex items-center justify-center border border-blue-500/20">
                                <CreditCard className="w-7 h-7 text-blue-400" />
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-lg font-black italic uppercase tracking-tight text-blue-400">Out of Credits</h4>
                                <p className="text-xs text-blue-400/60 font-medium tracking-wide">Invite friends to earn free credits instantly and unlock 4K native rendering.</p>
                            </div>
                        </div>
                        <button className="relative z-10 h-12 px-10 bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-400 transition-all shadow-xl shadow-blue-500/30">
                            Earn Credits
                        </button>
                    </div>

                    {/* Stats Summary Area */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <StatCard title="Total Projects" value={projects.length.toString()} icon={<Video className="w-4 h-4" />} />
                        <StatCard title="Active Versions" value="12" icon={<Clock className="w-4 h-4" />} />
                        <StatCard title="Validated" value="0" icon={<CheckCircle2 className="w-4 h-4" />} />
                        <StatCard title="Errors" value="0" icon={<AlertCircle className="w-4 h-4" />} />
                    </div>

                    {/* Search & Organization Section */}
                    <div className="flex items-center gap-4">
                        <div className="relative flex-1 group">
                            <Plus className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-blue-500" />
                            <input 
                                className="w-full h-14 bg-white/[0.02] border border-white/5 rounded-2xl pl-14 pr-4 text-sm font-medium focus:outline-none focus:border-blue-500/30 focus:bg-white/[0.04] transition-all"
                                placeholder="Search productions..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <button className="h-14 px-8 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center gap-3 text-[10px] font-black uppercase tracking-widest hover:bg-white/[0.04] transition-all">
                            <Filter className="w-3.5 h-3.5" /> Sort: Recent
                        </button>
                    </div>

                    {/* Productions Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-12">
                        {projects.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).map(project => (
                            <ProjectCard key={project.id} project={project} onDelete={(id, e) => deleteProject(id, e)} onClick={() => openProject(project)} />
                        ))}

                        <div 
                            onClick={createProject}
                            className="border-2 border-dashed border-white/5 rounded-[40px] flex flex-col items-center justify-center p-12 text-center bg-white/[0.01] hover:bg-white/[0.03] transition-all cursor-pointer group min-h-[320px] hover:border-blue-500/20"
                        >
                            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-6 border border-white/5 group-hover:scale-110 group-hover:border-blue-500/30 group-hover:bg-blue-500/10 transition-all">
                                <Plus className="w-6 h-6 text-muted-foreground group-hover:text-blue-400" />
                            </div>
                            <h3 className="text-xs font-black italic uppercase tracking-[0.2em] opacity-40">New Production</h3>
                            <p className="text-[10px] text-muted-foreground uppercase mt-2 opacity-20 font-bold">Start from scratch</p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

// --- Sub-components ---
const NavItem: React.FC<{ icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void, disabled?: boolean }> = ({ icon, label, active = false, onClick, disabled = false }) => (
    <button 
        onClick={onClick}
        disabled={disabled}
        className={`w-full h-12 px-5 flex items-center gap-4 rounded-2xl transition-all ${
            disabled ? 'opacity-30 cursor-not-allowed grayscale' :
            active ? 'bg-blue-500 text-white shadow-xl shadow-blue-500/30' : 
            'text-muted-foreground hover:bg-white/5 hover:text-white'
        }`}
    >
        {icon}
        <span className="text-[11px] font-black italic uppercase tracking-widest">{label}</span>
        {active && <ChevronRight className="w-4 h-4 ml-auto opacity-50" />}
    </button>
);

const StatCard: React.FC<{ title: string, value: string, icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-white/[0.01] border border-white/5 rounded-[32px] p-8 flex items-center justify-between hover:bg-white/[0.03] transition-colors group">
        <div className="space-y-1">
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest opacity-30 group-hover:opacity-100 transition-opacity">{title}</p>
            <h3 className="text-3xl font-black italic">{value}</h3>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-muted-foreground border border-white/5 group-hover:border-blue-500/40 group-hover:text-blue-400 transition-all shadow-inner">
            {icon}
        </div>
    </div>
);

const ProjectCard: React.FC<{ project: Project, onDelete: (id: string, e: React.MouseEvent) => void, onClick: () => void }> = ({ project, onDelete, onClick }) => {
    return (
        <div 
            onClick={onClick}
            className="group relative bg-white/[0.01] border border-white/5 rounded-[44px] overflow-hidden hover:border-blue-500/30 transition-all duration-500 cursor-pointer shadow-black shadow-2xl"
        >
            <div className="aspect-video bg-[#080809] relative flex items-center justify-center group-hover:bg-neutral-900 transition-colors overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-indigo-500/5 opacity-40 group-hover:opacity-100 transition-opacity" />
                <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-2xl border border-blue-500/20">
                    <Play className="w-7 h-7 text-blue-500 fill-current ml-1" />
                </div>
                <button 
                    onClick={(e) => onDelete(project.id, e)}
                    className="absolute top-5 right-5 w-10 h-10 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10 opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:border-red-500 transition-all z-20 group/trash"
                >
                    <Trash2 className="w-4 h-4 text-white/40 group-hover/trash:text-white" />
                </button>
            </div>

            <div className="p-8 space-y-6">
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <h3 className="text-2xl font-black italic uppercase tracking-tighter group-hover:text-blue-400 transition-colors leading-none">{project.name}</h3>
                        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest pt-2">Local Project Archive</p>
                    </div>
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-white/5">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-50">
                        <Clock className="w-3.5 h-3.5" /> Synchronized
                    </div>
                    <button className="h-10 px-6 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-500 hover:text-white transition-all flex items-center gap-2 shadow-lg">
                        Studio <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default App;
