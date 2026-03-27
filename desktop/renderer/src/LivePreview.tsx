import React, { useMemo } from 'react';
import { Player } from '@remotion/player';

interface LivePreviewProps {
    code: string;
    resolution: string;
    fps: number;
}

export const LivePreview: React.FC<LivePreviewProps> = ({ code, resolution, fps }) => {
    // We attempt to evaluate the code safely
    // Note: In a real production app, we'd use a sandboxed iframe or a proper worker
    // but for the desktop preview, we'll use a dynamic component approach.
    
    const Component = useMemo(() => {
        try {
            // Very basic transform: handle 'export default' and 'remotion' imports
            // In a full implementation, we'd use @babel/standalone (which we have in package.json)
            const cleanCode = code
                .replace(/import {[^}]+} from 'remotion';/g, '')
                .replace(/import React[^;]*;/g, '')
                .replace(/export default function/g, 'function Component')
                .replace(/export const/g, 'const');

            // Wrap in a function that provides Remotion hooks
            const factory = new Function('React', 'Remotion', 
                'const { useCurrentFrame, interpolate, spring, AbsoluteFill } = Remotion;' +
                cleanCode + 
                'return Component;'
            );

            // This is a simplified mock of Remotion for the preview
            const MockRemotion = {
                useCurrentFrame: () => 0, // Player handles this
                interpolate: (v: any, i: any, o: any, s: any) => v, 
                spring: (v: any) => 0,
                AbsoluteFill: ({ children, style, className }: any) => (
                    <div style={{ position: 'absolute', inset: 0, ...style }} className={className}>
                        {children}
                    </div>
                )
            };

            return factory(React, MockRemotion);
        } catch (e) {
            console.error("Failed to compile preview code:", e);
            return null;
        }
    }, [code]);

    const [width, height] = resolution === '9:16' ? [1080, 1920] : [1920, 1080];

    return (
        <div className="w-full h-full bg-black rounded-lg overflow-hidden flex items-center justify-center border border-white/5">
            {Component ? (
                <Player
                    component={Component}
                    durationInFrames={300}
                    compositionWidth={width}
                    compositionHeight={height}
                    fps={fps}
                    style={{
                        width: '100%',
                        height: '100%',
                    }}
                    controls
                    autoPlay
                    loop
                />
            ) : (
                <div className="text-white/20 text-xs font-mono">
                    <pre className="text-red-500/50">Compilation Error</pre>
                </div>
            )}
        </div>
    );
};
