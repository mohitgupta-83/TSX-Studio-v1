import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { addCredits } from "@/lib/credits/creditService";

export async function processNewUserReferralSetup(userId: string, emailOrName: string) {
    // 1. Generate unique referral code: username + random string
    const baseName = emailOrName.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    const myReferralCode = `${baseName}${randomStr}`;

    await db.user.update({
        where: { id: userId },
        data: { referralCode: myReferralCode }
    });

    // 2. Process referral checking
    const cookieStore = await cookies();
    const referredByCode = cookieStore.get("referralCode")?.value;

    if (referredByCode) {
        // Find referrer by their referralCode string
        const referrer = await db.user.findUnique({
            where: { referralCode: referredByCode }
        });

        // 3. Security Check: Self referral blocking is native if we check IDs, but at this point, they're the new user.
        if (referrer && referrer.id !== userId) {
            // Check if user already referred somewhere else (just in case)
            const existingRef = await db.referralEvent.findUnique({
                where: { referredUserId: userId }
            });

            if (!existingRef) {
                // Link them
                await db.user.update({
                    where: { id: userId },
                    data: { referredById: referrer.id }
                });

                // Create ReferralEvent
                await db.referralEvent.create({
                    data: {
                        referrerId: referrer.id,
                        referredUserId: userId,
                        status: "SIGNED_UP"
                    }
                });
            }
        }
    }
}

export async function processUserActivation(userId: string) {
    // Reward user when they activate (e.g. generate TSX)
    // Find a pending referral event where this user is the REFERRED user
    const refEvent = await db.referralEvent.findUnique({
        where: { referredUserId: userId }
    });

    if (refEvent && refEvent.status === "SIGNED_UP") {
        await db.$transaction(async (tx) => {
            // Re-verify the status to avoid double-reward inside transaction via a lock or direct update check
            const currentEvent = await tx.referralEvent.findUnique({
                where: { id: refEvent.id }
            });

            if (currentEvent?.status !== "SIGNED_UP") return;

            // Update status to REWARDED
            await tx.referralEvent.update({
                where: { id: refEvent.id },
                data: { status: "REWARDED" }
            });

            // Add credits
            // Re-using creditService isn't possible directly safely inside a different tx unless we do it serially or pass tx
            // Let's do it manually within this transaction to be completely atomic

            // 1. Reward Referrer: +5 credits
            await tx.user.update({
                where: { id: refEvent.referrerId },
                data: { creditsBalance: { increment: 5 } }
            });
            await tx.creditTransaction.create({
                data: {
                    userId: refEvent.referrerId,
                    type: "REFERRAL_REWARD",
                    amount: 5,
                    description: "Reward for successful referral"
                }
            });

            // 2. Reward Referred User: +2 credits
            await tx.user.update({
                where: { id: refEvent.referredUserId },
                data: { creditsBalance: { increment: 2 } }
            });
            await tx.creditTransaction.create({
                data: {
                    userId: refEvent.referredUserId,
                    type: "REFERRAL_REWARD",
                    amount: 2,
                    description: "Welcome bonus from referral"
                }
            });
        });
    }
}
