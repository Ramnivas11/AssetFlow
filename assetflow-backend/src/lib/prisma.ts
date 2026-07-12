import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
    prisma?: PrismaClient;
};

const createPrismaClient = () => {
    try {
        return new PrismaClient({
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