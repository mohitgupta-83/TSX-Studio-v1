import { TemplatePreview, TemplateData } from "@/components/TemplatePreview";
import { Button } from "@/components/ui/button";
import { getAllTemplates } from "@/lib/template-system/registry";
import Link from "next/link";

export default function TemplatesPage() {
    return (
        <div className="p-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Templates Library</h1>
                <p className="text-muted-foreground">Start with a professional base and customize with your code.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {getAllTemplates().map((template) => {
                    // Extract template schema into our template data format
                    const defaultValues = template.schema.fields.reduce((acc, field) => ({
                      ...acc,
                      [field.id]: field.defaultValue
                    }), {});
                    
                    const templateData: TemplateData = {
                        name: template.schema.name,
                        description: template.schema.description,
                        tsxCode: template.generateCode(defaultValues),
                        prompt: "System predefined template",
                        duration: template.schema.durationInFrames || 300,
                        tags: template.schema.tags || [],
                        width: template.schema.width || 1080,
                        height: template.schema.height || 1920
                    };
                    
                    return <TemplatePreview key={template.id} template={templateData} />;
                })}
            </div>

            {/* Suggest a template CTA */}
            <div className="mt-12 p-8 rounded-2xl border border-white/5 bg-primary/5 text-center">
                <h3 className="text-lg font-bold mb-2">Need a specific template?</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                    We are constantly adding new starter files. Tell us what you want to see next in the library.
                </p>
                <Button variant="link" className="text-primary font-bold">Suggest a Template</Button>
            </div>
        </div>
    );
}
