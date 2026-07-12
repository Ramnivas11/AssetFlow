import { randomUUID } from "crypto";
import { Prisma, UserStatus } from "@prisma/client";

import { HTTP_STATUS } from "../../constants/httpStatus";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../../lib/jwt";
import { hashPassword, verifyPassword } from "../../lib/password";
import { AppError } from "../../utils/AppError";
import { AuthTokensDTO, UserResponseDTO } from "./auth.dto";
import { toUserResponseDTO } from "./auth.mapper";
import { AuthRepository, hashRefreshToken, verifyRefreshTokenHash } from "./auth.repository";
import { LoginDTO, SignupDTO } from "./auth.validation";

export class AuthService {
    constructor(private readonly authRepository: AuthRepository) {}

    async signup(dto: SignupDTO): Promise<UserResponseDTO> {
        const email = dto.email.toLowerCase();
        if (await this.authRepository.findUserByEmail(email)) {
            throw new AppError("Email already registered", HTTP_STATUS.CONFLICT);
        }
        let user;
        try {
            user = await this.authRepository.createUser({ name: dto.name, email, password: await hashPassword(dto.password) });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
                throw new AppError("Email already registered", HTTP_STATUS.CONFLICT);
            }
            throw error;
        }
        return toUserResponseDTO(user);
    }

    async login(dto: LoginDTO): Promise<{ user: UserResponseDTO; tokens: AuthTokensDTO }> {
        const user = await this.authRepository.findUserByEmail(dto.email);
        if (!user || user.deletedAt || user.status !== UserStatus.ACTIVE || !(await verifyPassword(dto.password, user.password))) {
            throw new AppError("Invalid email or password", HTTP_STATUS.UNAUTHORIZED);
        }
        return { user: toUserResponseDTO(user), tokens: await this.issueTokens(user.id, user.role) };
    }

    async refresh(refreshToken: string): Promise<AuthTokensDTO> {
        let payload;
        try { payload = verifyRefreshToken(refreshToken); }
        catch { throw new AppError("Invalid or expired refresh token", HTTP_STATUS.UNAUTHORIZED); }

        const stored = await this.authRepository.findRefreshToken(payload.jti);
        if (!stored || stored.revokedAt || stored.expiresAt <= new Date() || stored.user.deletedAt || stored.user.status !== UserStatus.ACTIVE || !verifyRefreshTokenHash(refreshToken, stored.token)) {
            throw new AppError("Invalid or expired refresh token", HTTP_STATUS.UNAUTHORIZED);
        }
        await this.authRepository.revokeRefreshToken(stored.id);
        return this.issueTokens(stored.user.id, stored.user.role);
    }

    async logout(refreshToken: string | undefined) {
        if (!refreshToken) return;
        try { await this.authRepository.revokeRefreshToken(verifyRefreshToken(refreshToken).jti); }
        catch { /* Invalid cookies are cleared by the controller. */ }
    }

    async logoutAll(userId: string) { await this.authRepository.revokeAllRefreshTokens(userId); }

    private async issueTokens(userId: string, role: string): Promise<AuthTokensDTO> {
        const tokenId = randomUUID();
        const refreshToken = generateRefreshToken(userId, tokenId);
        const expiresAt = new Date(verifyRefreshToken(refreshToken).exp! * 1000);
        await this.authRepository.createRefreshToken(tokenId, userId, hashRefreshToken(refreshToken), expiresAt);
        return { accessToken: generateAccessToken(userId, role), refreshToken };
    }
}
