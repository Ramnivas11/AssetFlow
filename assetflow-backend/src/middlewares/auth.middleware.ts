import { NextFunction, Request, Response } from "express";
import { Role } from "@prisma/client";

import { verifyAccessToken } from "../lib/jwt";
import { AppError } from "../utils/AppError";
import { HTTP_STATUS } from "../constants/httpStatus";
import { AuthenticatedUser } from "../modules/auth/auth.types";

export interface AuthenticatedRequest extends Request { auth?: AuthenticatedUser; }

export const authenticate = (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) return next(new AppError("Authentication is required", HTTP_STATUS.UNAUTHORIZED));
    try {
        const payload = verifyAccessToken(token);
        req.auth = { userId: payload.sub, role: payload.role as Role };
        return next();
    } catch {
        return next(new AppError("Invalid or expired access token", HTTP_STATUS.UNAUTHORIZED));
    }
};

export const authorize = (...roles: Role[]) => (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.auth || !roles.includes(req.auth.role)) return next(new AppError("You do not have permission to perform this action", HTTP_STATUS.FORBIDDEN));
    return next();
};
