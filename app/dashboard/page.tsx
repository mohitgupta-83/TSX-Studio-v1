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

    // Fetch user's projects
    const projects = await db.project.findMany({
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
    const totalVersions = projects.reduce((acc, p) => acc + p._count.versions, 0);
    const validatedCount = await db.projectVersion.count({
        where: {
            project: { userId: session.user.id },
            validated: true,
        },
    });
    const errorCount = await db.renderJob.count({
        where: {
            userId: session.user.id,
            status: "FAILED",
        },
    });

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

    const credits = await getCredits(session.user.id);

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

