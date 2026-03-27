export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function POST(req: Request) {
    try {
        const { email, name } = await req.json();

        if (!email) {
            return NextResponse.json(
                { error: "Email is required" },
                { status: 400 }
            );
        }

        // Check if user already exists
        const existingUser = await db.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return NextResponse.json(
                { error: "User already exists" },
                { status: 400 }
            );
        }

        // Create new user
        const user = await db.user.create({
            data: {
                email,
                name: name || email.split("@")[0],
                emailVerified: new Date(),
            },
        });

        // Create default entitlement
        await db.userEntitlement.create({
            data: {
                userId: user.id,
                plan: "FREE",
                creditsBalance: 3,
                monthlyCredits: 3,
            },
        });

        // Grant initial credits transaction
        await db.creditTransaction.create({
            data: {
                userId: user.id,
                type: "MONTHLY_GRANT",
                amount: 3,
            },
        });

        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
            },
        });
    } catch (error) {
        console.error("Signup error:", error);
        return NextResponse.json(
            { error: "Failed to create account" },
            { status: 500 }
        );
    }
}
