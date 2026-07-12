import { createHash, timingSafeEqual } from "node:crypto";
import { PrismaClient, Role } from "@prisma/client";

import { prisma } from "../../lib/prisma";

export const hashRefreshToken = (refreshToken: string) => createHash("sha256").update(refreshToken).digest("hex");

export const verifyRefreshTokenHash = (refreshToken: string, hash: string) => {
    const computed = createHash("sha256").update(refreshToken).digest();
    const expected = Buffer.from(hash, "hex");
    if (computed.length !== expected.length) return false;
    return timingSafeEqual(computed, expected);
};

export class AuthRepository {
    constructor(private readonly db: PrismaClient = prisma) {}

    async findUserByEmail(email: string) {
        return this.db.user.findFirst({
            where: {
                email,
                deletedAt: null,
            },
        });
    }

    async createUser(data: {
        name: string;
        email: string;
        password: string;
    }) {
        return this.db.user.create({
            data: { ...data, role: Role.EMPLOYEE },
        });
    }

    async createRefreshToken(id: string, userId: string, tokenHash: string, expiresAt: Date) {
        return this.db.refreshToken.create({ data: { id, userId, token: tokenHash, expiresAt } });
    }

    async findRefreshToken(id: string) {
        return this.db.refreshToken.findUnique({ where: { id }, include: { user: true } });
    }

    async revokeRefreshToken(id: string) {
        return this.db.refreshToken.updateMany({ where: { id, revokedAt: null }, data: { revokedAt: new Date() } });
    }

    async revokeAllRefreshTokens(userId: string) {
        return this.db.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
    }
}
