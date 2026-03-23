import { generateCaptionTSX } from "@/lib/caption-engine/generator";
import { getSceneBackground, SceneStyle } from "./sceneGenerator";
import { processScript } from "./scriptProcessor";
import { syncVoiceWithCaptions } from "./voiceSync";

export async function generateFullVideoPipeline(
    text: string, 
    captionStyleId: string, 
    sceneStyleId: SceneStyle, 
    estimatedDuration: number
): Promise<string> {
    
    // 1. Process Script
    const captions = processScript(text);
    
    // 2. Sync visually without Voice (using equal distribution or random)
    const synced = syncVoiceWithCaptions(captions, estimatedDuration);
    
    // 3. Format as Generator JSON
    const captionJson = { segments: synced };
    
    // 4. Generate TSX via Caption Engine
    let finalTsx = generateCaptionTSX(captionJson, captionStyleId);
    
    const bgElement = getSceneBackground(sceneStyleId);
    
    // Replace the inner content returned 
    // Captions function usually returns: `return (\n    <AbsoluteFill>\n`
    finalTsx = finalTsx.replace(
        /return\s*\(\s*<AbsoluteFill>/,
        `return (\n    <AbsoluteFill>\n      {/* Generated Scene */}\n      ${bgElement}`
    );

    return finalTsx;
}
