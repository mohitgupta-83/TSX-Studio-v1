export const dynamic = "force-dynamic";

import { Suspense } from "react";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { DashboardClient } from "./dashboard-client";
import { getCredits } from "@/lib/credits/creditService";

export default async function DashboardPage() {
    const session = await auth();

    if (!session?.user?.id) {
        redirect("/login");
    }

    let projects: any[] = [];
    let totalVersions = 0;
    let validatedCount = 0;
    let errorCount = 0;

    try {
        // Fetch user's projects
        projects = await db.project.findMany({
            where: { userId: session.user.id },
            orderBy: { updatedAt: "desc" },
            include: {
                versions: {
                    orderBy: { versionNumber: "desc" },
                    take: 1,
                },
                _count: {
                    select: { versions: true, renderJobs: true },
                },
            },
        });

        // Calculate stats
        totalVersions = projects.reduce((acc, p) => acc + p._count.versions, 0);
        validatedCount = await db.projectVersion.count({
            where: {
                project: { userId: session.user.id },
                validated: true,
            },
        });
        errorCount = await db.renderJob.count({
            where: {
                userId: session.user.id,
                status: "FAILED",
            },
        });
    } catch (dbError) {
        console.warn("Database connection unavailable (AWS Neon Timeout) - loading dashboard in failsafe mode.", dbError);
    }

    // Serialize dates for client component
    const serializedProjects = (projects as any).map((p: any) => ({
        id: p.id,
        name: p.name,
        status: p.status,
        resolution: p.resolution,
        fps: p.fps,
        thumbnailUrl: p.thumbnailUrl,
        updatedAt: p.updatedAt.toISOString(),
        createdAt: p.createdAt.toISOString(),
        latestVersion: p.versions[0] ? {
            id: p.versions[0].id,
            title: p.versions[0].title,
            validated: p.versions[0].validated,
        } : null,
        _count: p._count,
    }));

    const stats = {
        totalProjects: projects.length,
        totalVersions,
        validatedCount,
        errorCount,
    };

    let credits: any = null;
    try {
        credits = await getCredits(session.user.id);
    } catch (e) {
        // Mock fallback if DB is entirely down on their network
        credits = { amount: 3, id: "offline" }; 
    }

    return (
        <Suspense fallback={<div>Loading Dashboard...</div>}>
            <DashboardClient
                projects={serializedProjects}
                stats={stats}
                userName={session.user.name || session.user.email || "User"}
                credits={credits}
            />
        </Suspense>
    );
}

