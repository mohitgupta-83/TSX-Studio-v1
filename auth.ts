import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import { authConfig } from "./auth.config";
import { validateEnv } from "@/lib/env";

// Validate env vars at runtime
validateEnv();

// Import it at top
import { processNewUserReferralSetup } from "@/lib/referrals/referralService";

export const { handlers, auth, signIn, signOut } = NextAuth({
    adapter: PrismaAdapter(db),
    session: { strategy: "jwt" },
    trustHost: true,
    secret: process.env.AUTH_SECRET,
    ...authConfig,
    events: {
        async createUser({ user }) {
            if (user.id && user.email) {
                await processNewUserReferralSetup(user.id, user.email);
            }
        }
    },
    callbacks: {
        ...authConfig.callbacks,
        async jwt({ token, user, account }) {
            // On initial sign in, user object is available
            if (user) {
                // For credentials login, create user if doesn't exist
                if (account?.provider === "credentials" && user.email) {
                    let dbUser = await db.user.findUnique({
                        where: { email: user.email },
                    });

                    if (!dbUser) {
                        // Create basic user without password for credentials provider (identifier usage)
                        dbUser = await db.user.create({
                            data: {
                                email: user.email,
                                name: user.name || user.email.split("@")[0],
                                emailVerified: new Date(),
                            },
                        });

                        // Give default entitlement
                        await db.userEntitlement.create({
                            data: {
                                userId: dbUser.id,
                                creditsBalance: 3,
                            }
                        });

                        // Initial transaction
                        await db.creditTransaction.create({
                            data: {
                                userId: dbUser.id,
                                type: "INITIAL_GRANT",
                                amount: 3,
                            }
                        });

                        // Referral processing
                        await processNewUserReferralSetup(dbUser.id, user.email);
                    }

                    token.sub = dbUser.id;
                    token.name = dbUser.name;
                    token.email = dbUser.email;
                }
            }
            return token;
        },
        async session({ session, token }) {
            if (token.sub && session.user) {
                session.user.id = token.sub;
                session.user.name = token.name;
                session.user.email = token.email as string;
            }
            return session;
        },
    },
});
