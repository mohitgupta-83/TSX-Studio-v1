export const runtime = "nodejs";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

// This endpoint processes transcription via our ASR hybrid engine
export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
        storageKey,
        fileName,
        model = "base",
    } = await req.json();

    const job = await db.transcriptionJob.create({
        data: {
            userId: session.user.id,
            fileName: fileName || "unnamed_media",
            filePath: storageKey || "local_path",
            model: model || "base",
            status: "RUNNING", // set to running initially
        },
    });

    try {
        const { processAudioWithEngine } = await import("@/lib/asr-engine/router");
        const jsonOutput = await processAudioWithEngine({
            audioPath: storageKey, // assuming storageKey holds the absolute local path for now
            // We interpret language through auto detect or model mapping internally
        });

        await db.transcriptionJob.update({
            where: { id: job.id },
            data: {
                status: "DONE",
                jsonOutput: JSON.stringify(jsonOutput),
            },
        });

        return NextResponse.json({
            id: job.id,
            status: "DONE",
            jsonOutput: jsonOutput
        });

    } catch (error: any) {
        await db.transcriptionJob.update({
            where: { id: job.id },
            data: {
                status: "FAILED",
                errorMessage: error.message || "Failed during transcription",
            },
        });

        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET() {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const jobs = await db.transcriptionJob.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        take: 20,
    });

    return NextResponse.json(jobs);
}

// Support for CLI to push results back
export async function PUT(req: Request) {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new NextResponse("Unauthorized", { status: 401 });

    const { jobId, jsonOutput, status } = await req.json();

    const job = await db.transcriptionJob.findUnique({
        where: { id: jobId }
    });

    if (job) {
        await db.transcriptionJob.update({
            where: { id: jobId },
            data: {
                status: status || "DONE",
                jsonOutput: JSON.stringify(jsonOutput),
            },
        });
    }

    return NextResponse.json({ success: true });
}
