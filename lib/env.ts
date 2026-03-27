import { z } from "zod";

const envSchema = z.object({
    DATABASE_URL: z.string().url(),
    AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
    NEXTAUTH_URL: z.string().url(),
    AUTH_TRUST_HOST: z.string().optional().or(z.boolean().optional()).default(true),

    // Redis for BullMQ
    REDIS_URL: z.string().url().optional(),
    REDIS_HOST: z.string().optional().default("localhost"),
    REDIS_PORT: z.string().optional().default("6379"),

    // Storage (S3 / R2)
    AWS_REGION: z.string().optional().default("auto"),
    AWS_ENDPOINT: z.string().optional(),
    AWS_S3_BUCKET: z.string().min(1, "AWS_S3_BUCKET is required"),
    AWS_ACCESS_KEY_ID: z.string().min(1, "AWS_ACCESS_KEY_ID is required"),
    AWS_SECRET_ACCESS_KEY: z.string().min(1, "AWS_SECRET_ACCESS_KEY is required"),

    // Google OAuth (optional)
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
});

export const validateEnv = () => {
    const isBuildTime = process.env.NODE_ENV === 'production';

    const result = envSchema.safeParse(process.env);

    if (!result.success) {
        const errors = result.error.flatten().fieldErrors;

        if (isBuildTime) {
            console.warn("⚠️ Continuing build despite missing env vars. Ensure they are set in Vercel Dashboard for runtime.");
            return null;
        }

        console.error("❌ Invalid environment variables:", errors);

        // Only throw if critical vars are missing and we're not in build time
        if (!process.env.DATABASE_URL || !process.env.AUTH_SECRET) {
            throw new Error(`Missing critical environment variables: ${JSON.stringify(errors)}`);
        }
    }

    return result.data;
};
