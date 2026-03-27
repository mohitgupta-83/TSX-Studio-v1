export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ projectId: string }> }
) {
    const { projectId } = await params;

    // Check for professional API token or Session
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.split(" ")[1];
        // In a real app, you would verify a dedicated API key here
        // For now, we allow the AUTH_SECRET itself or a user session for simplified local development
        const session = await auth();
        userId = session?.user?.id || null;
    } else {
        const session = await auth();
        userId = session?.user?.id || null;
    }

    if (!userId) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const project = await db.project.findUnique({
        where: { id: projectId, userId },
        include: {
            versions: {
                orderBy: { versionNumber: "desc" },
                take: 1
            }
        }
    });

    if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const latestVersion = project.versions[0];

    return NextResponse.json({
        projectId: project.id,
        composition: {
            width: project.resolution === '4k' ? 3840 : 1920,
            height: project.resolution === '4k' ? 2160 : 1080,
            fps: project.fps || 30,
            durationInFrames: 300 // Fixed for now, would come from DB
        },
        remotionEntry: "index.tsx",
        assets: [], // Would describe dynamic assets
        props: {},
        // Legacy fields for backward compat if needed
        code: latestVersion.code,
        name: project.name
    });
}
