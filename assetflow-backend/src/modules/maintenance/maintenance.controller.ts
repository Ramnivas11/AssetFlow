import { Response } from "express";
import { HTTP_STATUS } from "../../constants/httpStatus";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/apiResponse";
import { getActor } from "../common/request-context";
import { maintenanceService } from "./maintenance.service";

export const listMaintenance = asyncHandler(async (req: AuthenticatedRequest, res: Response) => sendSuccess(res, HTTP_STATUS.OK, "Maintenance requests retrieved", await maintenanceService.list(req.query, getActor(req))));
export const createMaintenance = asyncHandler(async (req: AuthenticatedRequest, res: Response) => sendSuccess(res, HTTP_STATUS.CREATED, "Maintenance request created", await maintenanceService.create(req.body, getActor(req))));
export const decideMaintenance = asyncHandler(async (req: AuthenticatedRequest, res: Response) => sendSuccess(res, HTTP_STATUS.OK, "Maintenance request updated", await maintenanceService.decide(String(req.params.id), req.body, getActor(req))));
export const updateMaintenanceStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => sendSuccess(res, HTTP_STATUS.OK, "Maintenance status updated", await maintenanceService.updateStatus(String(req.params.id), req.body, getActor(req))));
