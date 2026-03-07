import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import crypto from "crypto";

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { name, description, tags, category, tsxCode, previewVideoUrl } = body;

        // Validate rules
        if (!tsxCode || !name || !description || !category) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Auto generate slug
        const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
        const randomSuffix = crypto.randomBytes(3).toString("hex");
        const uniqueSlug = `${baseSlug}-${randomSuffix}`;

        const newTemplate = (await db.template.create({
            data: {
                name,
                title: name,
                slug: uniqueSlug,
                description,
                tags: tags || "Captions,Template",
                category,
                previewVideoUrl,
                code: tsxCode,
                tsxCode: tsxCode,
                authorId: session.user.id,
                status: "PENDING",
            } as any
        })) as any;

        return NextResponse.json({ success: true, slug: newTemplate.slug });
    } catch (error: any) {
        console.error("Error submitting template:", error);
        return NextResponse.json({ error: error.message || "Failed to submit template" }, { status: 500 });
    }
}
