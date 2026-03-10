import { BuiltInTemplate } from "./types";
import { viralCaptionTemplate } from "./templates/viral-caption";
import { startupStoryTemplate } from "./templates/startup-story";
import { motivationQuoteTemplate } from "./templates/motivation-quote";

export const builtInTemplates: BuiltInTemplate[] = [
    viralCaptionTemplate,
    startupStoryTemplate,
    motivationQuoteTemplate
];

export function getTemplateById(id: string): BuiltInTemplate | undefined {
    return builtInTemplates.find(t => t.id === id);
}

export function getAllTemplates(): BuiltInTemplate[] {
    return builtInTemplates;
}
