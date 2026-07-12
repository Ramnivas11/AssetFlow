import { Request, Response } from "express";

import { cookieConfig } from "../../config/cookie";
import { HTTP_STATUS } from "../../constants/httpStatus";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/apiResponse";
import { authService } from "./auth.container";

export const signup = asyncHandler(async (req: Request, res: Response) =>
    sendSuccess(res, HTTP_STATUS.CREATED, "Account created successfully", await authService.signup(req.body)));

export const login = asyncHandler(async (req: Request, res: Response) => {
    const { user, tokens } = await authService.login(req.body);
    res.cookie("refreshToken", tokens.refreshToken, cookieConfig);
    return sendSuccess(res, HTTP_STATUS.OK, "Login successful", { user, accessToken: tokens.accessToken });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
    const tokens = await authService.refresh(req.cookies.refreshToken);
    res.cookie("refreshToken", tokens.refreshToken, cookieConfig);
    return sendSuccess(res, HTTP_STATUS.OK, "Session refreshed", { accessToken: tokens.accessToken });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
    await authService.logout(req.cookies.refreshToken);
    res.clearCookie("refreshToken", cookieConfig);
    return sendSuccess(res, HTTP_STATUS.OK, "Logged out");
});

export const logoutAll = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    await authService.logoutAll(req.auth!.userId);
    res.clearCookie("refreshToken", cookieConfig);
    return sendSuccess(res, HTTP_STATUS.OK, "Logged out from all devices");
});
