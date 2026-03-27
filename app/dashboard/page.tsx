// We check if we are building for export (no server)
const isExportBuild = process.env.NEXT_PHASE === 'phase-export' || process.env.npm_lifecycle_event === 'build';

import { Suspense } from "react";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
    // In export mode, we only provide a fallback client-side experience
    if (isExportBuild) {
        return (
            <Suspense fallback={<div>Loading Dashboard...</div>}>
                <DashboardClient
                    projects={[]}
                    stats={{ totalProjects: 0, totalVersions: 0, validatedCount: 0, errorCount: 0 }}
                    userName="User"
                    credits={0}
                />
            </Suspense>
        );
    }
    
    // Normal server-side logic (ignored during export build)
    const { auth } = await import("@/auth");
    const { db } = await import("@/lib/db");
    const { redirect } = await import("next/navigation");
    const { getCredits } = await import("@/lib/credits/creditService");
    
    const session = await auth();
    if (!session || !session.user) {
        return null;
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
        totalVersions = projects.reduce((acc, p) => acc + (p._count?.versions || 0), 0);
        validatedCount = projects.filter(p => p.latestVersion?.validated).length;

        // Fetch credits
        const credits = await getCredits(session.user.id as string);

        return (
            <Suspense fallback={<div>Loading Dashboard...</div>}>
                <DashboardClient
                    projects={projects}
                    stats={{
                        totalProjects: projects.length,
                        totalVersions,
                        validatedCount,
                        errorCount
                    }}
                    userName={session.user.name || "User"}
                    credits={credits}
                />
            </Suspense>
        );
    } catch (error) {
        console.error("Dashboard error:", error);
        return (
            <Suspense fallback={<div>Loading Dashboard...</div>}>
                <DashboardClient
                    projects={[]}
                    stats={{ totalProjects: 0, totalVersions: 0, validatedCount: 0, errorCount: 0 }}
                    userName={session.user.name || "User"}
                    credits={0}
                />
            </Suspense>
        );
    }
}
