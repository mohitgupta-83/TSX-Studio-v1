"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeString = sanitizeString;
exports.generateTemplateCode = generateTemplateCode;
function sanitizeString(value, defaultValue = "") {
    if (value === undefined || value === null)
        return defaultValue;
    return String(value)
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/'/g, "\\'")
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r');
}
function generateTemplateCode(imports, componentContent, width = 1080, height = 1920, fps = 30, duration = 300) {
    return `import React from 'react';
import { Composition, registerRoot, AbsoluteFill, useVideoConfig, useCurrentFrame, interpolate, spring, Easing } from 'remotion';
${imports.join('\n')}

export default function TemplateComposition() {
${componentContent}
}

// Remotion configuration (ignored by our web preview, but useful for desktop)
export const RemotionRoot: React.FC = () => {
    return (
        <Composition
            id="Main"
            component={TemplateComposition}
            durationInFrames={${duration}}
            fps={${fps}}
            width={${width}}
            height={${height}}
        />
    );
};

// Only register in Remotion root if we're not inside our custom preview engine
if (typeof window === 'undefined' || !(window as any).isTsxStudioPreview) {
    registerRoot(RemotionRoot);
}
`;
}
//# sourceMappingURL=codegen.js.map