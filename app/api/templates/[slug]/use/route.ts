import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { addCredits } from "@/lib/credits/creditService";

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { slug } = await params;

        // Fetch the template
        const template = await db.template.findUnique({
            where: { slug }
        });

        if (!template) {
            return NextResponse.json({ error: "Template not found" }, { status: 404 });
        }

        if (template.status !== "PUBLISHED") {
            return NextResponse.json({ error: "Template is not available" }, { status: 403 });
        }

        const userId = session.user.id;
        const authorId = template.authorId;

        // 1. Transaction to handle +1 usage and create the project
        const project = await db.$transaction(async (tx) => {
            // Create project
            const newProject = await tx.project.create({
                data: {
                    name: `Copy of ${template.name || template.title}`,
                    userId: userId,
                    status: "DRAFT",
                    type: "TEMPLATE_CLONE"
                }
            });

            // Create version
            await tx.projectVersion.create({
                data: {
                    projectId: newProject.id,
                    code: template.tsxCode || template.code,
                    title: "Template Clone",
                    versionNumber: 1
                }
            });

            // Update template usage
            await tx.template.update({
                where: { id: template.id },
                data: {
                    usesCount: { increment: 1 }
                }
            });

            return newProject;
        });

        // 2. Give reward if the user is not the author
        if (userId !== authorId) {
            try {
                await addCredits(authorId, 1, "TEMPLATE_USE_REWARD", `Reward for template: ${template.name || template.title}`);
            } catch (err) {
                console.error("Failed to reward template author:", err);
            }
        }

        return NextResponse.json({ success: true, projectId: project.id });
    } catch (error: any) {
        console.error("Error using template:", error);
        return NextResponse.json({ error: error.message || "Something went wrong" }, { status: 500 });
    }
}
