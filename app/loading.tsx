import { Loader2 } from "lucide-react";

export default function GlobalLoading() {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <div className="flex flex-col items-center justify-center text-neon-cyan gap-4">
                <Loader2 className="h-10 w-10 animate-spin opacity-80" />
                <p className="font-display font-black tracking-widest text-xs uppercase animate-pulse">
                    Accessing TSX Studio...
                </p>
            </div>
        </div>
    );
}
