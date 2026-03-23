import { NextRequest, NextResponse } from "next/server";
import { generatePremiumTSX } from "@/lib/premium-captions/renderer";
import { auth } from "@/auth";
import { deductCredits } from "@/lib/credits/creditService";
import { processUserActivation } from "@/lib/referrals/referralService";

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { json, style } = body;

        if (!json) {
            return NextResponse.json({ error: "Missing json in request body" }, { status: 400 });
        }

        if (!style) {
            return NextResponse.json({ error: "Missing style in request body" }, { status: 400 });
        }

        const cost = style === "clean" ? 1 : 2;

        try {
            await deductCredits(session.user.id, cost, "USAGE", `Caption Generation (${style})`);
        } catch (e: any) {
            return NextResponse.json({ error: e.message }, { status: 403 });
        }

        const tsx = generatePremiumTSX(json, style);

        // Process referral reward (only happens once per user correctly handled inside service)
        await processUserActivation(session.user.id);

        return NextResponse.json({ tsxCode: tsx });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to generate TSX" }, { status: 500 });
    }
}
