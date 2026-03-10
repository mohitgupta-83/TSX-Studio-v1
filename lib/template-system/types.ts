export type TemplateFieldType = "text" | "color" | "number" | "slider" | "select" | "textarea" | "image";

export interface TemplateFieldOption {
    label: string;
    value: string;
}

export interface TemplateField {
    id: string;
    type: TemplateFieldType;
    label: string;
    description?: string;
    defaultValue?: any;
    // Type-specific options
    min?: number;
    max?: number;
    step?: number;
    options?: TemplateFieldOption[]; // For select
    placeholder?: string;
}

export interface TemplateSchema {
    id: string; // Add ID to schema to easily identify
    name: string;
    description: string;
    category: string;
    tags: string[];
    fields: TemplateField[];
    width?: number;       // default 1080
    height?: number;      // default 1920
    fps?: number;         // default 30
    durationInFrames?: number; // default 300
}

export interface BuiltInTemplate {
    id: string;
    schema: TemplateSchema;
    // Function that generates TSX code from field values
    generateCode: (values: Record<string, any>) => string;
    thumbnailGradient?: string; // Optional nice background for the template card
    thumbnailUrl?: string; // Replace gradients with explicit images later
    previewVideoUrl?: string; // Short preview video
}
