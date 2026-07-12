import { Response } from "express";

import { HTTP_STATUS } from "../../constants/httpStatus";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/apiResponse";
import { departmentService } from "./department.container";

const getActor = (req: AuthenticatedRequest) => ({
    userId: req.auth!.userId,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
});

export const listDepartments = asyncHandler(async (req: AuthenticatedRequest, res: Response) =>
    sendSuccess(res, HTTP_STATUS.OK, "Departments retrieved", await departmentService.list(req.query)));

export const getDepartment = asyncHandler(async (req: AuthenticatedRequest, res: Response) =>
    sendSuccess(res, HTTP_STATUS.OK, "Department retrieved", await departmentService.getById(String(req.params.id))));

export const createDepartment = asyncHandler(async (req: AuthenticatedRequest, res: Response) =>
    sendSuccess(res, HTTP_STATUS.CREATED, "Department created", await departmentService.create(req.body, getActor(req))));

export const updateDepartment = asyncHandler(async (req: AuthenticatedRequest, res: Response) =>
    sendSuccess(res, HTTP_STATUS.OK, "Department updated", await departmentService.update(String(req.params.id), req.body, getActor(req))));

export const deactivateDepartment = asyncHandler(async (req: AuthenticatedRequest, res: Response) =>
    sendSuccess(res, HTTP_STATUS.OK, "Department deactivated", await departmentService.deactivate(String(req.params.id), getActor(req))));
