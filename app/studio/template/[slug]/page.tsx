import { notFound } from "next/navigation";
import { getTemplateById } from "@/lib/template-system/registry";
import { TemplateStudio } from "@/components/template-studio";

export const metadata = {
    title: "Template Editor | TSX Studio",
    description: "Visually edit TSX templates with live preview."
};

interface PageProps {
    params: Promise<{
        slug: string;
    }>;
}

export default async function TemplateStudioPage({ params }: PageProps) {
    const { slug } = await params;

    // Attempt to load from built-in registry to check existence
    const template = getTemplateById(slug);

    if (!template) {
        notFound();
    }

    // Pass the standard serializable string since TemplateStudio is a Client Component
    return <TemplateStudio templateId={slug} />;
}
