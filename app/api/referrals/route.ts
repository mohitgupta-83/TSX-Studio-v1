export const runtime = "nodejs";

import { auth } from "@/auth";

import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import crypto from "crypto";

export async function GET() {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { referralCode: true }
    });

    let code = user?.referralCode;

    if (!code) {
        // Fallback generator
        const baseName = (session.user.name || session.user.email || 'user').split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
        code = `${baseName}${randomStr}`;
        await db.user.update({
            where: { id: session.user.id },
            data: { referralCode: code }
        });
    }

    // 2. Get Referral Stats
    const referrals = await db.referralEvent.findMany({
        where: { referrerId: session.user.id },
        include: {
            referredUser: {
                select: {
                    name: true,
                    email: true,
                    createdAt: true
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    const successfulReferrals = referrals.filter(r => r.status === "REWARDED");
    const totalEarned = successfulReferrals.length * 5; // Example: 5 credits per referral

    return NextResponse.json({
        code: code,
        referrals: referrals.map(r => ({
            id: r.id,
            name: r.referredUser?.name || "Elite User",
            email: r.referredUser?.email?.replace(/(.{3}).*(@.*)/, "$1...$2") || "Hidden",
            status: r.status,
            date: r.createdAt
        })),
        stats: {
            totalCount: referrals.length,
            totalEarned
        }
    });
}
