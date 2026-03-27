import React, { useState, useEffect } from 'react';
import { 
    ChevronLeft, 
    Play, 
    Save, 
    Share2, 
    Download, 
    History, 
    Code2, 
    Layers, 
    Layout, 
    Settings, 
    Zap,
    MousePointer2,
    MonitorPlay,
    Loader2,
    Trash2,
    CreditCard,
    CheckCircle2
} from 'lucide-react';
import Editor from '@monaco-editor/react';
import { LivePreview } from './LivePreview';

interface StudioProps {
    project: any;
    onBack: () => void;
}

export const Studio: React.FC<StudioProps> = ({ project, onBack }) => {
    const [code, setCode] = useState(project.code);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('preview');

    const handleSave = async () => {
        setIsSaving(true);
        // We'll update our local storage
        const stored = localStorage.getItem('tsx-local-projects');
        if (stored) {
            const projects = JSON.parse(stored);
            const index = projects.findIndex((p: any) => p.id === project.id);
            if (index !== -1) {
                projects[index].code = code;
                projects[index].updatedAt = new Date().toISOString();
                localStorage.setItem('tsx-local-projects', JSON.stringify(projects));
            }
        }
        setTimeout(() => setIsSaving(false), 500); // Simulate network delay
    };

    return (
        <div className="flex flex-col h-screen bg-[#020202] text-white">
            {/* Top Navigation Bar - High End Style */}
            <header className="h-16 border-b border-white/5 bg-black/40 backdrop-blur-3xl flex items-center justify-between px-6 z-50">
                <div className="flex items-center gap-6">
                    <button onClick={onBack} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors border border-white/5 group">
                        <ChevronLeft className="w-5 h-5 text-white/40 group-hover:text-white" />
                    </button>
                    <div className="h-6 w-[1px] bg-white/10" />
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-sm font-black italic tracking-tight uppercase">{project.name}</h2>
                            <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-[8px] font-black uppercase text-blue-400 tracking-widest border border-blue-500/20">Studio Native</span>
                        </div>
                        <p className="text-[10px] text-white/20 font-bold tracking-tight lowercase mt-0.5">last saved {new Date(project.updatedAt).toLocaleTimeString()}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button onClick={handleSave} className="h-10 px-6 bg-white/[0.03] border border-white/5 text-white/[0.4] text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-white/[0.08] hover:text-white transition-all flex items-center gap-2">
                        {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                        {isSaving ? 'Syncing...' : 'Save Production'}
                    </button>
                    <button className="h-10 px-8 bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-400 transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2">
                        <Zap className="w-3.5 h-3.5 fill-current" /> Build Output
                    </button>
                </div>
            </header>

            {/* Split Main Editor/Preview Layout */}
            <main className="flex-1 flex overflow-hidden">
                {/* Left Controls/Timeline Rail */}
                <aside className="w-20 border-r border-white/5 bg-black/40 flex flex-col items-center py-8 gap-8 overflow-y-auto">
                    <StudioTab icon={<MousePointer2 />} active />
                    <StudioTab icon={<Layers />} />
                    <StudioTab icon={<Layout />} />
                    <StudioTab icon={<History />} />
                    <div className="mt-auto">
                        <StudioTab icon={<Settings />} />
                    </div>
                </aside>

                {/* Workspace Content */}
                <section className="flex-1 flex flex-col relative overflow-hidden bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.03),transparent)]">
                    
                    {/* View Switcher Bar */}
                    <div className="h-12 border-b border-white/5 flex items-center px-4 justify-between">
                         <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 space-x-1">
                            <button onClick={() => setActiveTab('preview')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'preview' ? 'bg-white text-black shadow-lg' : 'text-white/40 hover:text-white/60 hover:bg-white/5'}`}>Output Preview</button>
                            <button onClick={() => setActiveTab('editor')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'editor' ? 'bg-white text-black shadow-lg' : 'text-white/40 hover:text-white/60 hover:bg-white/5'}`}>TSX Code Editor</button>
                        </div>
                        <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-white/20">
                            <MonitorPlay className="w-3.5 h-3.5" /> 1920x1080 @ 30fps
                        </div>
                    </div>

                    <div className="flex-1 flex overflow-hidden">
                        {activeTab === 'editor' ? (
                            <div className="flex-1 h-full bg-[#050505]">
                                <Editor
                                    height="100%"
                                    defaultLanguage="typescript"
                                    theme="vs-dark"
                                    value={code}
                                    onChange={(v) => setCode(v || '')}
                                    options={{
                                        minimap: { enabled: false },
                                        fontSize: 13,
                                        fontFamily: 'monospace',
                                        padding: { top: 20 },
                                        scrollBeyondLastLine: false,
                                        lineNumbers: 'on',
                                        automaticLayout: true,
                                        cursorSmoothCaretAnimation: "on",
                                        smoothScrolling: true
                                    }}
                                />
                            </div>
                        ) : (
                            <div className="flex-1 h-full p-12 bg-black overflow-hidden relative group">
                                <LivePreview code={code} resolution={project.resolution} fps={project.fps} />
                            </div>
                        )}
                    </div>

                    {/* Timeline / Version Footer */}
                    <footer className="h-56 border-t border-white/5 bg-black/50 p-6 flex flex-col gap-6">
                        <div className="flex items-center justify-between">
                            <h4 className="text-[10px] font-black uppercase text-white/40 tracking-widest">Active Production History</h4>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                <p className="text-[10px] font-black uppercase text-blue-500 tracking-widest">REALTIME ENGINE ACTIVE</p>
                            </div>
                        </div>
                        
                        <div className="flex-1 flex gap-4 overflow-x-auto pb-2">
                            <VersionCard active title="v12 - Current Head" time="now" />
                            <VersionCard title="v11 - Added Reveal Anim" time="4h ago" />
                            <VersionCard title="v10 - Text Polish" time="1d ago" />
                        </div>
                    </footer>
                </section>

                {/* Properties Sidebar (Real SaaS Design) */}
                <aside className="w-80 border-l border-white/5 bg-black/40 p-6 flex flex-col gap-8 opacity-40 grayscale pointer-events-none">
                     <div className="space-y-4">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Studio Parameters</h3>
                        <div className="space-y-3">
                             <div className="h-10 w-full bg-white/5 border border-white/5 rounded-xl px-4 flex items-center justify-between">
                                <span className="text-xs text-white/40">Resolution</span>
                                <span className="text-xs font-bold">1080p Native</span>
                             </div>
                             <div className="h-10 w-full bg-white/5 border border-white/5 rounded-xl px-4 flex items-center justify-between">
                                <span className="text-xs text-white/40">Frame Rate</span>
                                <span className="text-xs font-bold">30.00 FPS</span>
                             </div>
                        </div>
                     </div>
                     <div className="space-y-4">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Output Status</h3>
                         <div className="p-4 bg-green-500/5 border border-green-500/10 rounded-2xl flex items-center gap-4">
                            <CheckCircle2 className="w-5 h-5 text-green-400" />
                            <div>
                                <h5 className="text-[10px] font-black uppercase text-green-400">Validated Output</h5>
                                <p className="text-[8px] text-green-400/40 font-bold lowercase tracking-tight">Code structure is 100% Correct</p>
                            </div>
                         </div>
                     </div>
                </aside>
            </main>

            {/* Global Overlay: Floating Credit Status */}
            <div className="fixed bottom-6 right-6 px-6 py-3 bg-black/60 backdrop-blur-3xl border border-white/10 rounded-full flex items-center gap-4 shadow-2xl z-[1000] border-t-white/20">
                <CreditCard className="w-4 h-4 text-blue-400" />
                <div className="h-4 w-[1px] bg-white/20" />
                <p className="text-[9px] font-black uppercase tracking-[0.2em]">0 <span className="text-blue-400">Credits Available</span></p>
                <div className="h-4 w-[1px] bg-white/20" />
                <button className="text-[9px] font-black uppercase text-blue-400 hover:text-white transition-colors tracking-widest">Recharge</button>
            </div>
        </div>
    );
};

const StudioTab = ({ icon, active = false }: { icon: any, active?: boolean }) => (
    <button className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all ${active ? 'bg-blue-500 text-white border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.5)]' : 'bg-white/5 text-muted-foreground border-white/5 hover:bg-white/10'}`}>
        {React.cloneElement(active ? icon : icon, { className: 'w-5 h-5' })}
    </button>
);

const VersionCard = ({ title, time, active = false }: { title: string, time: string, active?: boolean }) => (
    <div className={`min-w-[240px] px-6 py-4 rounded-3xl border transition-all flex flex-col justify-between ${active ? 'bg-blue-600/10 border-blue-500/30' : 'bg-white/[0.03] border-white/5 hover:border-white/10'}`}>
        <div>
             <h5 className={`text-xs font-black uppercase tracking-tight ${active ? 'text-white' : 'text-white/40'}`}>{title}</h5>
             <p className="text-[10px] text-white/20 font-bold lowercase tracking-tight mt-1">Rendered {time}</p>
        </div>
        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-white/5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
            <span className="text-[8px] font-black uppercase text-white/20 tracking-widest">Restore</span>
        </div>
    </div>
);
