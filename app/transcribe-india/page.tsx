"use client";

import { Download, Mic, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function TranscribeIndiaPage() {
    const router = useRouter();

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-8">
            <div className="max-w-3xl w-full">
                <Button 
                    variant="ghost" 
                    onClick={() => router.back()}
                    className="mb-8 text-white/50 hover:text-white hover:bg-white/5"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>

                <div className="bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1a] border border-white/5 rounded-[40px] p-12 text-center space-y-8 relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-30" />

                    <div className="w-24 h-24 bg-white/5 border border-white/10 rounded-3xl mx-auto flex items-center justify-center shadow-inner">
                        <Mic className="w-12 h-12 text-primary" />
                    </div>

                    <div className="space-y-4 max-w-2xl mx-auto">
                        <h2 className="text-4xl font-black italic tracking-tight uppercase leading-none">
                            Indian Language <br />
                            <span className="text-primary">Transcription</span>
                        </h2>
                        
                        <p className="text-lg text-white/60 font-medium leading-relaxed bg-primary/10 border border-primary/20 rounded-2xl p-6">
                            "Indian language transcription works best on our desktop app for higher accuracy."
                        </p>
                    </div>

                    <div className="grid sm:grid-cols-3 gap-6 text-left py-8 max-w-2xl mx-auto border-t border-b border-white/5">
                        <div className="space-y-2">
                            <h3 className="font-bold text-white flex items-center">
                                <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs mr-2">1</span>
                                Better Accuracy
                            </h3>
                            <p className="text-xs text-white/40 leading-relaxed">
                                Significantly higher precision for Hindi, Hinglish, Tamil, Telugu, and other regional languages.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <h3 className="font-bold text-white flex items-center">
                                <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs mr-2">2</span>
                                Offline Processing
                            </h3>
                            <p className="text-xs text-white/40 leading-relaxed">
                                Complete privacy and security. Audio never leaves your computer.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <h3 className="font-bold text-white flex items-center">
                                <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs mr-2">3</span>
                                No API Limits
                            </h3>
                            <p className="text-xs text-white/40 leading-relaxed">
                                Transcribe unlimited hours of audio locally without hitting usage caps.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                        <Button
                            onClick={() => {
                                toast.info("Preparing Download...");
                                router.push('/download');
                            }}
                            size="lg"
                            className="h-16 px-10 bg-white text-black hover:bg-neutral-200 font-black italic rounded-2xl transition-all active:scale-95 text-base w-full sm:w-auto shadow-xl shadow-white/10"
                        >
                            <Download className="w-5 h-5 mr-3" />
                            DOWNLOAD DESKTOP APP
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
