import jwt, { JwtPayload } from "jsonwebtoken";

import { jwtConfig } from "../config/jwt";

export interface AccessTokenPayload extends JwtPayload { sub: string; role: string; }
export interface RefreshTokenPayload extends JwtPayload { sub: string; jti: string; }

export const generateAccessToken = (userId: string, role: string) => jwt.sign({ role }, jwtConfig.accessSecret, {
    subject: userId, expiresIn: jwtConfig.accessExpiresIn as jwt.SignOptions["expiresIn"],
});
export const generateRefreshToken = (userId: string, tokenId: string) => jwt.sign({}, jwtConfig.refreshSecret, {
    subject: userId, jwtid: tokenId, expiresIn: jwtConfig.refreshExpiresIn as jwt.SignOptions["expiresIn"],
});
export const verifyAccessToken = (token: string) => jwt.verify(token, jwtConfig.accessSecret) as AccessTokenPayload;
export const verifyRefreshToken = (token: string) => jwt.verify(token, jwtConfig.refreshSecret) as RefreshTokenPayload;
