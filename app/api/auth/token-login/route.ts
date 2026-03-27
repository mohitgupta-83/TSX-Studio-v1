export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { signIn } from "@/auth";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
        return NextResponse.json({ error: "No token provided" }, { status: 400 });
    }

    try {
        // Decode the token we generated in /api/auth/desktop
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString());

        if (decoded.exp < Date.now()) {
            return NextResponse.json({ error: "Token expired" }, { status: 401 });
        }

        const user = await db.user.findUnique({
            where: { id: decoded.uid }
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // We use the credentials provider to perform a "Silent Login"
        // This sets the NextAuth session cookies for the Electron renderer
        await signIn("credentials", {
            email: user.email,
            redirect: false,
        });

        return NextResponse.redirect(new URL("/dashboard", request.url));
    } catch (e) {
        console.error("Token login failed:", e);
        return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }
}
