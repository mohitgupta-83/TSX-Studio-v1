export const runtime = "nodejs";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

// GET /api/projects - List user projects
export async function GET(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");

    const projects = await db.project.findMany({
        where: {
            userId: session.user.id,
            ...(workspaceId ? { workspaceId } : {}),
        },
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

    return NextResponse.json(projects);
}

// POST /api/projects - Create new project
export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Auto-heal: Ensure user exists in DB to avoid FK violation
        let user = await db.user.findUnique({ where: { id: session.user.id } });
        if (!user) {
            console.log("User not found in DB, auto-creating:", session.user);
            user = await db.user.create({
                data: {
                    id: session.user.id,
                    name: session.user.name || "User",
                    email: session.user.email || `user-${session.user.id}@example.com`,
                    image: session.user.image,
                }
            });
            // Also give default entitlement
            await db.userEntitlement.create({
                data: {
                    userId: user.id,
                    creditsBalance: 100,
                }
            });
        }

        const body = await req.json();
        let { name, resolution = "1080p", fps = 30, workspaceId, thumbnailUrl } = body;

        // Defensive parsing
        fps = parseInt(String(fps));
        if (isNaN(fps)) fps = 30;

        if (!name) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        let safeComponentName = name.replace(/[^a-zA-Z0-9]/g, '') || "MyAnimation";
        if (/^\d/.test(safeComponentName)) {
            safeComponentName = `Comp${safeComponentName}`;
        }

        console.log("[API/Projects] Creating project:", { name, resolution, fps, thumbnailUrl });

        // Create project with initial version
        const project = await db.project.create({
            data: {
                userId: session.user.id,
                name,
                resolution,
                fps,
                thumbnailUrl: thumbnailUrl || "https://images.unsplash.com/photo-1620641788421-7a1c342f42e2?auto=format&fit=crop&q=80&w=800",
                workspaceId: workspaceId || null,
                status: "Draft",
                versions: {
                    create: {
                        versionNumber: 1,
                        title: "Initial Draft",
                        code: `import { AbsoluteFill, useCurrentFrame, interpolate, spring } from 'remotion';
import React from 'react';

export const fps = 30;
export const durationInFrames = 10 * fps;

const easeOutExpo = (x: number) =>
  x >= 1 ? 1 : 1 - Math.pow(2, -10 * Math.max(0, x));

const easeOutCubic = (x: number) =>
  1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);

const easeInOutQuart = (x: number) => {
  const v = Math.min(1, Math.max(0, x));
  return v < 0.5 ? 8 * v * v * v * v : 1 - Math.pow(-2 * v + 2, 4) / 2;
};

const easeOutBack = (x: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const v = Math.min(1, Math.max(0, x));
  return 1 + c3 * Math.pow(v - 1, 3) + c1 * Math.pow(v - 1, 2);
};

const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };

const accent = '#818cf8';
const accentB = '#6366f1';
const accentGold = '#d4a96a';

const PARTICLE_COUNT = 28;
const particles = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
  id: i,
  x: 4 + ((i * 139.5) % 92),
  y: 4 + ((i * 92.3) % 92),
  size: 1.2 + (i % 5) * 1.05,
  speed: 0.07 + (i % 7) * 0.044,
  phase: (i * 0.72) % (Math.PI * 2),
  opacity: 0.026 + (i % 5) * 0.023,
  accent: i % 4 === 0,
}));

export default function CinematicReveal() {
  const frame = useCurrentFrame();
  const t = frame / fps;
  const total = durationInFrames;

  const cameraScale = interpolate(frame, [0, total], [1.0, 1.07], clamp);
  const softPulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 0.5);

  const orbX1 = 28 + Math.sin(t * 0.2) * 9;
  const orbY1 = 32 + Math.cos(t * 0.14) * 7;
  const orbX2 = 72 + Math.cos(t * 0.18) * 8;
  const orbY2 = 68 + Math.sin(t * 0.24) * 6;
  const lensOpacity = 0.04 + 0.025 * Math.sin(t * Math.PI * 0.5);

  // Light sweep beam
  const beamX = interpolate(frame, [0, total], [-30, 130], clamp);
  const beamOpacity = interpolate(frame, [0, 20, 80, total], [0, 0.07, 0.04, 0.02], clamp);

  // -- EYEBROW --
  const eyebrowSf = 8;
  const eyebrowSpring = spring({
    frame: Math.max(0, frame - eyebrowSf),
    fps,
    config: { damping: 22, stiffness: 180, mass: 0.72 },
    from: 0, to: 1,
  });
  const eyebrowOpacity = interpolate(frame, [eyebrowSf, eyebrowSf + 16], [0, 1], clamp);
  const eyebrowY = interpolate(eyebrowSpring, [0, 1], [28, 0], clamp);
  const eyebrowBlur = interpolate(frame, [eyebrowSf, eyebrowSf + 18], [8, 0], clamp);

  // -- INTRODUCING line --
  const introSf = 16;
  const introSpring = spring({
    frame: Math.max(0, frame - introSf),
    fps,
    config: { damping: 28, stiffness: 140, mass: 1.0 },
    from: 0, to: 1,
  });
  const introOpacity = interpolate(frame, [introSf, introSf + 18], [0, 1], clamp);
  const introY = interpolate(introSpring, [0, 1], [90, 0], clamp);
  const introBlur = interpolate(frame, [introSf, introSf + 24], [14, 0], clamp);
  const introScale = interpolate(introSpring, [0, 1], [0.91, 1.0], clamp);
  const introLetterSpacing = interpolate(introSpring, [0, 1], [6, -1], clamp);

  // -- TSX STUDIO (hero) --
  const heroSf = 28;
  const heroSpring = spring({
    frame: Math.max(0, frame - heroSf),
    fps,
    config: { damping: 24, stiffness: 130, mass: 1.12 },
    from: 0, to: 1,
  });
  const heroOpacity = interpolate(frame, [heroSf, heroSf + 20], [0, 1], clamp);
  const heroY = interpolate(heroSpring, [0, 1], [110, 0], clamp);
  const heroBlur = interpolate(frame, [heroSf, heroSf + 28], [18, 0], clamp);
  const heroScale = interpolate(heroSpring, [0, 1], [0.88, 1.0], clamp);
  const heroLetterSpacing = interpolate(heroSpring, [0, 1], [10, -5], clamp);
  const heroGlowRadius = interpolate(frame, [heroSf, heroSf + 60], [0, 80], clamp);

  const heroIdle = frame > heroSf + 40
    ? 1 + 0.003 * Math.sin((t - (heroSf + 40) / fps) * Math.PI * 0.7)
    : heroScale;

  // -- RULE LINE --
  const ruleSf = heroSf + 18;
  const ruleWidth = interpolate(frame, [ruleSf, ruleSf + 30], [0, 260], { ...clamp, easing: easeOutExpo });

  // -- SUBTITLE --
  const subtitleSf = heroSf + 22;
  const subtitleSpring = spring({
    frame: Math.max(0, frame - subtitleSf),
    fps,
    config: { damping: 26, stiffness: 150, mass: 0.90 },
    from: 0, to: 1,
  });
  const subtitleOpacity = interpolate(frame, [subtitleSf, subtitleSf + 18], [0, 1], clamp);
  const subtitleY = interpolate(subtitleSpring, [0, 1], [50, 0], clamp);
  const subtitleBlur = interpolate(frame, [subtitleSf, subtitleSf + 20], [8, 0], clamp);

  // -- BOTTOM BADGE --
  const badgeSf = subtitleSf + 24;
  const badgeOpacity = interpolate(frame, [badgeSf, badgeSf + 20], [0, 1], clamp);
  const badgeY = interpolate(
    spring({ frame: Math.max(0, frame - badgeSf), fps, config: { damping: 24, stiffness: 160, mass: 0.85 }, from: 0, to: 1 }),
    [0, 1], [30, 0], clamp
  );

  return (
    <AbsoluteFill style={{
      width: 1080,
      height: 1920,
      overflow: 'hidden',
      fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
    }}>

      {/* -- BACKGROUND SYSTEM -- */}
      <div style={{
        position: 'absolute', inset: 0,
        transform: \`scale(\${cameraScale})\`,
        transformOrigin: '50% 50%',
        willChange: 'transform',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(168deg, #06050f 0%, #0a0814 45%, #050409 80%, #080510 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: \`radial-gradient(ellipse at \${orbX1}% \${orbY1}%, rgba(129,140,248,0.13) 0%, transparent 52%)\` }} />
        <div style={{ position: 'absolute', inset: 0, background: \`radial-gradient(ellipse at \${orbX2}% \${orbY2}%, rgba(99,102,241,0.07) 0%, transparent 46%)\` }} />
        <div style={{ position: 'absolute', inset: 0, background: \`radial-gradient(ellipse at 50% 48%, rgba(212,169,106,0.06) 0%, transparent 48%)\`, opacity: lensOpacity * 14 }} />
        <div style={{ position: 'absolute', inset: 0, background: \`linear-gradient(105deg, transparent \${beamX - 12}%, rgba(255,255,255,\${beamOpacity}) \${beamX}%, transparent \${beamX + 12}%)\` }} />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 50%, transparent 22%, rgba(0,0,0,0.86) 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, opacity: 0.027, backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\\"0 0 512 512\\" xmlns=\\"http://www.w3.org/2000/svg\\"%3E%3Cfilter id=\\"n\\"%3E%3CfeTurbulence type=\\"fractalNoise\\" baseFrequency=\\"0.74\\" numOctaves=\\"4\\" stitchTiles=\\"stitch\\"/%3E%3C/filter%3E%3Crect width=\\"100%25\\" height=\\"100%25\\" filter=\\"url(%23n)\\"/%3E%3C/svg%3E")', backgroundSize: '256px 256px' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.014) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.014) 1px, transparent 1px)', backgroundSize: '88px 88px' }} />
      </div>

      {/* -- PARTICLES -- */}
      {particles.map(p => {
        const px = Math.cos(t * p.speed * Math.PI * 1.4 + p.phase) * 11;
        const py = Math.sin(t * p.speed * Math.PI * 2.0 + p.phase) * 22;
        const po = p.opacity * (0.5 + 0.5 * Math.sin(t * p.speed * Math.PI * 3 + p.phase));
        const fadeIn = interpolate(frame, [0, 22], [0, 1], clamp);
        return (
          <div key={p.id} style={{
            position: 'absolute', left: \`\${p.x}%\`, top: \`\${p.y}%\`, width: p.size, height: p.size, borderRadius: '50%',
            background: p.accent ? accent : '#ffffff', opacity: po * fadeIn,
            transform: \`translate(\${px}px, \${py}px)\`,
            willChange: 'transform',
            boxShadow: p.accent ? \`0 0 \${6 + softPulse * 4}px \${accent}88\` : 'none',
          }} />
        );
      })}

      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -58%)', width: 800, height: 500,
        background: \`radial-gradient(ellipse at 50% 50%, \${accent}\${Math.floor(heroOpacity * 18).toString(16).padStart(2, '0')} 0%, transparent 65%)\`,
        opacity: interpolate(frame, [heroSf, heroSf + 50], [0, 1], clamp),
        filter: \`blur(\${60 - heroOpacity * 20}px)\`,
        pointerEvents: 'none',
      }} />

      <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 80px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40, opacity: eyebrowOpacity, transform: \`translateY(\${eyebrowY}px)\`, filter: \`blur(\${eyebrowBlur}px)\`, willChange: 'transform' }}>
          <div style={{ width: interpolate(frame, [eyebrowSf + 4, eyebrowSf + 22], [0, 32], { ...clamp, easing: easeOutExpo }), height: 1, background: \`linear-gradient(90deg, transparent, \${accent}88)\` }} />
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: accent, boxShadow: \`0 0 \${10 + softPulse * 8}px \${accent}, 0 0 \${20 + softPulse * 12}px \${accent}55\` }} />
          <span style={{ fontSize: 21, fontWeight: 600, letterSpacing: '0.30em', color: \`\${accent}88\`, textTransform: 'uppercase' }}>Now Available</span>
          <div style={{ width: interpolate(frame, [eyebrowSf + 4, eyebrowSf + 22], [0, 32], { ...clamp, easing: easeOutExpo }), height: 1, background: \`linear-gradient(90deg, \${accent}88, transparent)\` }} />
        </div>

        <div style={{ overflow: 'hidden', marginBottom: 6 }}>
          <div style={{ opacity: introOpacity, transform: \`translateY(\${introY}px) scale(\${introScale})\`, filter: \`blur(\${introBlur}px)\`, willChange: 'transform' }}>
            <div style={{ fontSize: 72, fontWeight: 300, fontStyle: 'italic', color: 'rgba(255,255,255,0.55)', textAlign: 'center', letterSpacing: \`\${introLetterSpacing}px\`, lineHeight: 1.1 }}>Introducing</div>
          </div>
        </div>

        <div style={{ overflow: 'hidden', marginBottom: 4 }}>
          <div style={{ opacity: heroOpacity, transform: \`translateY(\${heroY}px) scale(\${frame > heroSf + 40 ? heroIdle : heroScale})\`, filter: \`blur(\${heroBlur}px)\`, willChange: 'transform' }}>
            <div style={{ fontSize: 148, fontWeight: 900, color: '#ffffff', textAlign: 'center', letterSpacing: \`\${heroLetterSpacing}px\`, lineHeight: 0.95, textShadow: \`0 0 \${heroGlowRadius}px \${accent}44, 0 0 \${heroGlowRadius * 1.6}px \${accent}22, 0 2px 0 rgba(0,0,0,0.5)\` }}>TSX</div>
          </div>
        </div>

        <div style={{ overflow: 'hidden', marginBottom: 48 }}>
          <div style={{ opacity: interpolate(frame, [heroSf + 6, heroSf + 26], [0, 1], clamp), transform: \`translateY(\${interpolate(spring({ frame: Math.max(0, frame - heroSf - 6), fps, config: { damping: 24, stiffness: 130, mass: 1.12 }, from: 0, to: 1 }), [0, 1], [90, 0], clamp)}px) scale(\${frame > heroSf + 40 ? heroIdle : heroScale})\`, filter: \`blur(\${interpolate(frame, [heroSf + 6, heroSf + 32], [14, 0], clamp)}px)\`, willChange: 'transform' }}>
            <div style={{ fontSize: 148, fontWeight: 900, color: 'transparent', backgroundImage: \`linear-gradient(135deg, \${accent} 0%, #c7d2fe 38%, \${accentB} 65%, \${accentGold} 100%)\`, backgroundClip: 'text', WebkitBackgroundClip: 'text', textAlign: 'center', letterSpacing: \`\${interpolate(spring({ frame: Math.max(0, frame - heroSf - 6), fps, config: { damping: 24, stiffness: 130, mass: 1.12 }, from: 0, to: 1 }), [0, 1], [10, -5], clamp)}px\`, lineHeight: 0.95, textShadow: 'none', filter: \`drop-shadow(0 0 \${30 + softPulse * 20}px \${accent}55)\` }}>Studio</div>
          </div>
        </div>

        <div style={{ width: ruleWidth, height: 2, borderRadius: 2, background: \`linear-gradient(90deg, transparent, \${accent}, \${accentGold}88, \${accentB}88, transparent)\`, boxShadow: \`0 0 14px \${accent}55, 0 0 28px \${accent}22\`, marginBottom: 44, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, bottom: 0, width: '28%', left: \`\${(Math.sin(t * 2.4) * 0.5 + 0.5) * 66}%\`, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.65), transparent)', opacity: 0.5 }} />
        </div>

        <div style={{ overflow: 'hidden', marginBottom: 72 }}>
          <div style={{ opacity: subtitleOpacity, transform: \`translateY(\${subtitleY}px)\`, filter: \`blur(\${subtitleBlur}px)\`, willChange: 'transform' }}>
            <div style={{ fontSize: 42, fontWeight: 400, color: 'rgba(255,255,255,0.48)', textAlign: 'center', letterSpacing: '0.01em', lineHeight: 1.5 }}>Create motion graphics with code</div>
          </div>
        </div>

        <div style={{ opacity: badgeOpacity, transform: \`translateY(\${badgeY}px)\`, willChange: 'transform' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, background: 'linear-gradient(138deg, rgba(255,255,255,0.062) 0%, rgba(255,255,255,0.018) 100%)', border: \`1px solid \${accent}33\`, borderRadius: 100, padding: '18px 48px', backdropFilter: 'blur(20px)', boxShadow: \`0 0 0 1px rgba(255,255,255,0.04), 0 20px 48px rgba(0,0,0,0.4), 0 0 \${24 + softPulse * 14}px \${accent}22\`, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: 1, background: \`linear-gradient(90deg, transparent, \${accent}44, transparent)\` }} />
            <div style={{ width: 9, height: 9, borderRadius: '50%', background: accentGold, boxShadow: \`0 0 \${8 + softPulse * 8}px \${accentGold}, 0 0 20px \${accentGold}66\` }} />
            <span style={{ fontSize: 24, fontWeight: 500, color: 'rgba(255,255,255,0.60)', letterSpacing: '0.08em' }}>React · Remotion · TypeScript</span>
            <div style={{ width: 9, height: 9, borderRadius: '50%', background: accent, boxShadow: \`0 0 \${8 + softPulse * 8}px \${accent}\` }} />
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}`,
                    },
                },
            } as any,
            include: {
                versions: true,
            },
        });

        // Log activity
        await db.activityLog.create({
            data: {
                userId: session.user.id,
                projectId: project.id,
                action: "PROJECT_CREATED",
                meta: JSON.stringify({ name, resolution, fps }),
            },
        });

        return NextResponse.json(project);
    } catch (error: any) {
        console.error("Project creation error:", error);
        return NextResponse.json(
            { error: "Failed to create project", details: error.message },
            { status: 500 }
        );
    }
}

// DELETE /api/projects - Delete a project
export async function DELETE(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("id");

    if (!projectId) {
        return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    // Verify ownership
    const project = await db.project.findFirst({
        where: {
            id: projectId,
            userId: session.user.id,
        },
    });

    if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    await db.project.delete({
        where: { id: projectId },
    });

    return NextResponse.json({ success: true });
}
