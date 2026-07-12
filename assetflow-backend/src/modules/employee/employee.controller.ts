import { Response } from "express";

import { HTTP_STATUS } from "../../constants/httpStatus";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/apiResponse";
import { employeeService } from "./employee.container";

const getActor = (req: AuthenticatedRequest) => ({
    userId: req.auth!.userId,
    role: req.auth!.role,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
});

export const listEmployees = asyncHandler(async (req: AuthenticatedRequest, res: Response) =>
    sendSuccess(res, HTTP_STATUS.OK, "Employees retrieved", await employeeService.list(req.query, getActor(req))));

export const getEmployee = asyncHandler(async (req: AuthenticatedRequest, res: Response) =>
    sendSuccess(res, HTTP_STATUS.OK, "Employee retrieved", await employeeService.getById(String(req.params.id))));

export const updateEmployeeRole = asyncHandler(async (req: AuthenticatedRequest, res: Response) =>
    sendSuccess(res, HTTP_STATUS.OK, "Employee role updated", await employeeService.updateRole(String(req.params.id), req.body, getActor(req))));

export const updateEmployeeStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) =>
    sendSuccess(res, HTTP_STATUS.OK, "Employee status updated", await employeeService.updateStatus(String(req.params.id), req.body, getActor(req))));
