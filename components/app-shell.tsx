"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    MonitorPlay,
    Library,
    Settings,
    User,
    LogOut,
    ChevronRight,
    Plus,
    CreditCard,
    ShoppingBag,
    Users,
    History,
    Terminal,
    ShieldAlert,
    UserCircle,
    Mic,
    ShieldCheck
} from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Templates", href: "/templates", icon: Library },
    { label: "Transcribe", href: "/transcribe", icon: Mic },
    { label: "Marketplace", href: "/marketplace", icon: ShoppingBag },
    { label: "Exports", href: "/exports", icon: History },
    { label: "Referrals", href: "/referrals", icon: Users },
    { label: "Pricing", href: "/billing", icon: CreditCard },
    { label: "Trust", href: "/trust", icon: ShieldCheck },
];

export function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { data: session } = useSession();

    return (
        <div className="flex min-h-screen bg-background text-foreground overflow-hidden">
            {/* Sidebar */}
            <aside className="w-72 border-r border-white/5 bg-background/50 backdrop-blur-3xl flex flex-col relative z-20 hidden md:flex">
                <div className="p-8">
                    <Link href="/" className="flex items-center gap-3 mb-12 group">
                        <div className="w-11 h-11 rounded-xl bg-neon-cyan/10 border border-white/5 flex items-center justify-center group-hover:bg-neon-cyan/20 transition-all shadow-[0_0_20px_rgba(39,242,255,0.1)] overflow-hidden">
                            <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover" />
                        </div>
                        <span className="text-xl font-display font-black tracking-tighter italic">TSX <span className="text-neon-cyan text-sm align-top ml-[-2px]">®</span></span>
                    </Link>



                    <nav className="space-y-1.5">
                        {navItems.map((item) => {
                            const isActive = pathname.startsWith(item.href);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all group relative overflow-hidden italic shadow-sm",
                                        isActive
                                            ? "bg-white text-black shadow-xl shadow-white/5"
                                            : "text-muted-foreground hover:text-white hover:bg-white/5"
                                    )}
                                >
                                    <item.icon className={cn("w-4 h-4", isActive ? "" : "group-hover:text-neon-cyan transition-colors")} />
                                    {item.label}
                                    {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-neon-cyan shadow-[0_0_10px_rgba(39,242,255,0.8)]" />}
                                    <ChevronRight className={cn("ml-auto w-3 h-3 transition-opacity", isActive ? "opacity-30" : "opacity-0")} />
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                <div className="mt-auto p-6 border-t border-white/5 bg-white/[0.01]">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="w-full flex items-center gap-4 p-2 pl-3 hover:bg-white/5 rounded-2xl transition-all group text-left">
                                <Avatar className="w-10 h-10 rounded-xl border border-white/5 group-hover:border-neon-cyan/30 transition-colors">
                                    <AvatarImage src={session?.user?.image || ""} />
                                    <AvatarFallback className="rounded-xl bg-neon-cyan/10 text-neon-cyan font-black text-xs uppercase italic">
                                        {session?.user?.name?.substring(0, 2).toUpperCase() || "JD"}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col overflow-hidden text-left">
                                    <span className="text-xs font-black uppercase tracking-tight truncate leading-tight">
                                        {session?.user?.name || "Member User"}
                                    </span>
                                    <span className="text-[9px] text-muted-foreground uppercase font-black tracking-[0.1em] opacity-60 truncate">
                                        {session?.user?.email}
                                    </span>
                                </div>
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" side="right" className="w-64 border-white/5 bg-card/90 backdrop-blur-3xl rounded-[24px] p-3 shadow-2xl ml-4">
                            <DropdownMenuLabel className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 p-3">System Identity</DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-white/5 mx-2" />
                            <DropdownMenuItem className="gap-3 cursor-pointer font-black text-[10px] uppercase tracking-widest rounded-xl p-3 hover:bg-neon-cyan hover:text-black transition-all group" asChild>
                                <Link href="/profile">
                                    <UserCircle className="w-4 h-4 opacity-50 group-hover:opacity-100" />
                                    Profile Matrix
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-3 cursor-pointer font-black text-[10px] uppercase tracking-widest rounded-xl p-3 hover:bg-neon-cyan hover:text-black transition-all group" asChild>
                                <Link href="/billing">
                                    <CreditCard className="w-4 h-4 opacity-50 group-hover:opacity-100" />
                                    Billing & Credits
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-3 cursor-pointer font-black text-[10px] uppercase tracking-widest rounded-xl p-3 hover:bg-neon-cyan hover:text-black transition-all group" asChild>
                                <Link href="/admin">
                                    <ShieldAlert className="w-4 h-4 text-destructive group-hover:text-black p-[1px]" />
                                    Admin Hub
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/5 mx-2" />
                            <DropdownMenuItem
                                onClick={() => signOut()}
                                className="gap-3 text-destructive focus:text-white focus:bg-destructive cursor-pointer font-black text-[10px] uppercase tracking-widest rounded-xl p-3 transition-all group"
                            >
                                <LogOut className="w-4 h-4 opacity-50 group-hover:opacity-100" />
                                Terminate Session
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto relative z-10">
                <div className="relative h-full flex flex-col pt-4 md:pt-0">
                    {children}
                </div>
            </main>
        </div>
    );
}
