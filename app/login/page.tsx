"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Terminal, Sparkles } from "lucide-react";
import { signIn } from "next-auth/react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const GoogleIcon = () => (
    <svg width="20" height="20" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
        <path d="M17.64 9.20455C17.64 8.56636 17.5827 7.95273 17.4764 7.36364H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.5614V15.8195H14.9564C16.6582 14.2527 17.64 11.9455 17.64 9.20455Z" fill="#4285F4" />
        <path d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5614C11.2418 14.1014 10.2109 14.4205 9 14.4205C6.65591 14.4205 4.67182 12.8373 3.96409 10.71H0.957273V13.0418C2.43818 15.9832 5.48182 18 9 18Z" fill="#34A853" />
        <path d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.83 3.96409 7.29V4.95818H0.957273C0.347727 6.17318 0 7.54773 0 9C0 10.4523 0.347727 11.8268 0.957273 13.0418L3.96409 10.71Z" fill="#FBBC05" />
        <path d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957273 4.95818L3.96409 7.29C4.67182 5.16273 6.65591 3.57955 9 3.57955Z" fill="#EA4335" />
    </svg>
);

export default function LoginPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [isExternalAuth, setIsExternalAuth] = useState(false);

    // Listen for Auth Success from Electron
    useEffect(() => {
        if (typeof window !== 'undefined' && (window as any).electronAPI) {
            const electron = (window as any).electronAPI;

            electron.getPendingToken?.().then((token: string) => {
                if (token) handleTokenLogin(token);
            });

            const unsubscribe = electron.onAuthSuccess?.((token: string) => {
                handleTokenLogin(token);
            });

            return () => unsubscribe?.();
        }
    }, []);

    const handleTokenLogin = async (token: string) => {
        setIsLoading(true);
        setIsExternalAuth(false);
        try {
            await signIn("credentials", {
                token,
                callbackUrl: "/dashboard",
                redirect: true
            });
            toast.success("Identity verified via secure bridge.");
        } catch (error) {
            toast.error("Bridge handshake failed.");
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background relative overflow-hidden selection:bg-neon-cyan/30 selection:text-neon-cyan">
            {/* Background Texture */}
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1635776062127-d379bfcba9f8?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center opacity-5 grayscale pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-neon-cyan/5 blur-[120px] pointer-events-none rounded-full" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md relative z-10"
            >
                <Card className="border-white/5 bg-background/40 backdrop-blur-3xl rounded-[40px] shadow-2xl p-4 overflow-hidden border">
                    <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                        <Terminal className="w-24 h-24 text-neon-cyan" />
                    </div>

                    <CardHeader className="space-y-4 text-center pt-8">
                        <div className="w-14 h-14 rounded-2xl bg-neon-cyan/10 border border-neon-cyan/20 flex items-center justify-center mx-auto shadow-2xl group transition-all">
                            <Terminal className="w-6 h-6 text-neon-cyan group-hover:scale-110 transition-transform" />
                        </div>
                        <div className="space-y-1">
                            <CardTitle className="text-3xl font-display font-black tracking-tighter italic uppercase text-white">Identity Check</CardTitle>
                            <CardDescription className="font-bold text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60 italic">
                                Establish your secure production link
                            </CardDescription>
                        </div>
                    </CardHeader>

                    <CardContent className="space-y-8 px-8 pb-12">
                        {isExternalAuth ? (
                            <div className="py-12 space-y-4 text-center animate-in fade-in zoom-in duration-500">
                                <div className="w-20 h-20 border-4 border-neon-cyan/10 border-t-neon-cyan rounded-full animate-spin mx-auto shadow-[0_0_20px_rgba(39,242,255,0.2)]" />
                                <div className="space-y-2">
                                    <h3 className="text-sm font-black uppercase tracking-widest text-white italic">Awaiting Protocol</h3>
                                    <p className="text-[10px] text-muted-foreground font-medium px-8 leading-relaxed">
                                        Check your default system browser to complete the Google identity handshake.
                                    </p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setIsExternalAuth(false)}
                                    className="text-[8px] font-black uppercase tracking-widest text-muted-foreground hover:text-white mt-4"
                                >
                                    Cancel Handshake
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="text-center space-y-2">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">Secure Auth Protocol</p>
                                </div>
                                <Button
                                    onClick={() => {
                                        if (typeof window !== 'undefined' && (window as any).electronAPI) {
                                            setIsExternalAuth(true);
                                            (window as any).electronAPI.login();
                                        } else {
                                            signIn("google");
                                        }
                                    }}
                                    disabled={isLoading}
                                    className="w-full h-16 bg-white/[0.03] border border-white/10 hover:border-neon-cyan/50 hover:bg-white/[0.06] rounded-full font-bold text-base transition-all duration-300 group relative flex items-center justify-center gap-4 hover:shadow-[0_0_30px_rgba(39,242,255,0.1)] active:scale-[0.98]"
                                >
                                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                                        <GoogleIcon />
                                    </div>
                                    <span className="text-white tracking-tight">Sign in with Google</span>
                                </Button>

                                {/* DEV LOGIN BUTTON */}
                                {/* TESTING PHASE BYPASS - ONE CLICK HANDSHAKE */}
                                <Button
                                    onClick={() => {
                                        setIsLoading(true);
                                        signIn("credentials", { email: "dev@tsx.studio", callbackUrl: "/dashboard" });
                                    }}
                                    disabled={isLoading}
                                    className="w-full h-12 bg-purple-500/10 border border-purple-500/20 hover:border-purple-500/50 hover:bg-purple-500/20 rounded-full font-bold text-sm transition-all duration-300 active:scale-[0.98] flex items-center justify-center text-purple-400 hover:text-purple-300"
                                >
                                    <Terminal className="w-4 h-4 mr-2" />
                                    <span>One-Click Dev Login (Testing Phase)</span>
                                </Button>

                                <p className="text-[9px] text-center text-muted-foreground font-medium uppercase tracking-widest opacity-40">
                                    Encrypted Handshake Enabled
                                </p>
                            </div>
                        )}
                    </CardContent>

                    <CardFooter className="flex flex-col items-center gap-6 pb-12 pt-0">
                        <div className="flex items-center gap-4 text-muted-foreground/20">
                            <Sparkles className="w-4 h-4" />
                            <div className="w-[1px] h-4 bg-white/5" />
                            <span className="text-[8px] font-black uppercase tracking-[0.5em]">TSX PRODUCTION ENGINE V.0.9</span>
                        </div>
                    </CardFooter>
                </Card>
            </motion.div>
        </div>
    );
}
