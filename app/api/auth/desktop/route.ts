export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function GET() {
    const session = await auth();

    if (!session?.user?.id) {
        // Redirect to login if not authenticated
        return NextResponse.redirect(new URL("/login?callbackUrl=/api/auth/desktop", process.env.NEXTAUTH_URL || "http://localhost:3000"));
    }

    // In a real production app, you would generate a long-lived API token here
    // For this demonstration, we'll return a success page with a token for the user to copy
    // OR redirect to a custom protocol if registered (e.g. tsx-studio://token=xyz)

    const token = Buffer.from(JSON.stringify({
        uid: session.user.id,
        email: session.user.email,
        exp: Date.now() + 30 * 24 * 60 * 60 * 1000
    })).toString('base64');

    return new NextResponse(`
        <html>
            <body style="background: #09090b; color: #fff; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
                <div style="text-align: center; background: #18181b; padding: 2rem; border-radius: 1rem; border: 1px solid #27272a;">
                    <h1 style="color: #a855f7;">Connection Successful</h1>
                    <p style="color: #a1a1aa;">You can now close this window and return to the desktop app.</p>
                    <div style="margin-top: 1rem; padding: 0.5rem; background: #000; border-radius: 0.5rem; font-family: monospace; font-size: 0.8rem; word-break: break-all; opacity: 0.5;">
                        ${token}
                    </div>
                </div>
                <script>
                    // If the desktop app registered a protocol
                    window.location.href = "tsx-studio://auth/callback?token=${token}";
                    // Auto-close after 5 seconds if protocol worked
                    setTimeout(() => window.close(), 5000);
                </script>
            </body>
        </html>
    `, { headers: { 'Content-Type': 'text/html' } });
}
