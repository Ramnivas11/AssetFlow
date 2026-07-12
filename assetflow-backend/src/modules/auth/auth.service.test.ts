import assert from "node:assert/strict";
import test from "node:test";
import { Role, UserStatus } from "@prisma/client";

import { AuthRepository } from "./auth.repository";
import { AuthService } from "./auth.service";
import { hashPassword } from "../../lib/password";

const password = "ValidPassword1!";

test("signup always persists the Employee role", async () => {
    const repository = {
        findUserByEmail: async () => null,
        createUser: async (input: { name: string; email: string; password: string }) => ({
            id: "user-1", ...input, role: Role.EMPLOYEE, departmentId: null,
        }),
    } as unknown as AuthRepository;
    const service = new AuthService(repository);

    const user = await service.signup({ name: "New Employee", email: "NEW@EXAMPLE.COM", password });

    assert.equal(user.role, Role.EMPLOYEE);
    assert.equal(user.email, "new@example.com");
});

test("refresh rotation rejects reuse of the revoked token", async () => {
    const passwordHash = await hashPassword(password);
    const refreshTokens = new Map<string, { id: string; token: string; expiresAt: Date; revokedAt: Date | null; user: { id: string; role: Role; status: UserStatus; deletedAt: Date | null } }>();
    const repository = {
        findUserByEmail: async () => ({
            id: "user-1", name: "Employee", email: "employee@example.com", password: passwordHash,
            role: Role.EMPLOYEE, status: UserStatus.ACTIVE, deletedAt: null, departmentId: null,
        }),
        createRefreshToken: async (id: string, userId: string, token: string, expiresAt: Date) => {
            refreshTokens.set(id, { id, token, expiresAt, revokedAt: null, user: { id: userId, role: Role.EMPLOYEE, status: UserStatus.ACTIVE, deletedAt: null } });
        },
        findRefreshToken: async (id: string) => refreshTokens.get(id) ?? null,
        revokeRefreshToken: async (id: string) => {
            const token = refreshTokens.get(id);
            if (token && !token.revokedAt) token.revokedAt = new Date();
        },
    } as unknown as AuthRepository;
    const service = new AuthService(repository);
    const login = await service.login({ email: "employee@example.com", password });
    const initial = login.tokens;

    await service.refresh(initial.refreshToken);
    await assert.rejects(() => service.refresh(initial.refreshToken), { message: "Invalid or expired refresh token" });
});
