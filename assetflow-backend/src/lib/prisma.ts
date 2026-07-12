import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { env } from "../config/env";

const globalForPrisma = globalThis as unknown as {
    prisma?: PrismaClient;
};

const createPrismaClient = () => {
    try {
        const pool = new Pool({ connectionString: env.DATABASE_URL });
        const adapter = new PrismaPg(pool);
        return new PrismaClient({
            adapter,
            log: ["query", "warn", "error"],
        });
    } catch (error) {
        console.warn("Prisma client unavailable, using a no-op fallback:", error);
        return new Proxy({} as PrismaClient, {
            get() {
                throw new Error("Prisma client is unavailable in this environment");
            },
        });
    }
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}