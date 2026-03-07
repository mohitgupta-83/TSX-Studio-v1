import { db } from "@/lib/db";

export async function addCredits(userId: string, amount: number, type: string, description: string) {
    if (amount <= 0) throw new Error("Amount must be positive");

    return await db.$transaction(async (tx) => {
        // Increment user balance
        const updatedUser = await tx.user.update({
            where: { id: userId },
            data: {
                creditsBalance: {
                    increment: amount
                }
            }
        });

        // Record transaction
        await tx.creditTransaction.create({
            data: {
                userId,
                amount: Math.abs(amount), // positive values in db? The prompt shows +5 and -1 but doesn't dictate sign in db. It's safe to store absolute values with explicit type, or store the signed value. We'll store absolute values for positive, but we should store the exact value user passed or negative for deduct. I'll pass signed positive for add, and negative for deduct.
                type,
                description
            }
        });

        return updatedUser.creditsBalance;
    });
}

export async function deductCredits(userId: string, amount: number, type: string, description?: string) {
    if (amount <= 0) throw new Error("Amount must be positive");

    return await db.$transaction(async (tx) => {
        // Fetch user to check balance FIRST to prevent negatives
        const user = await tx.user.findUnique({
            where: { id: userId }
        });

        if (!user) throw new Error("User not found");
        if ((user.creditsBalance || 0) < amount) {
            throw new Error("Not enough credits");
        }

        // Deduct balance safely
        const updatedUser = await tx.user.update({
            where: { id: userId },
            data: {
                creditsBalance: {
                    decrement: amount
                }
            }
        });

        // Record transaction (store negative amount for deduction history visibility)
        await tx.creditTransaction.create({
            data: {
                userId,
                amount: -Math.abs(amount),
                type,
                description: description || `Spent on ${type}`
            }
        });

        return updatedUser.creditsBalance;
    });
}

export async function getCredits(userId: string) {
    const user = await db.user.findUnique({
        where: { id: userId },
        select: { creditsBalance: true }
    });
    return user?.creditsBalance || 0;
}
