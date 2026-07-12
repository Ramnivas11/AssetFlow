import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
    NODE_ENV: z.enum(["development", "production", "test"]),

    PORT: z.coerce.number().default(5000),

    DATABASE_URL: z.string().min(1),

    CLIENT_URL: z.string().url(),

    JWT_ACCESS_SECRET: z.string().min(32),

    JWT_REFRESH_SECRET: z.string().min(32),

    JWT_ACCESS_EXPIRES_IN: z.string(),

    JWT_REFRESH_EXPIRES_IN: z.string(),

    BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error("❌ Invalid environment variables");

    console.error(parsed.error.flatten().fieldErrors);

    process.exit(1);
}

export const env = parsed.data;
