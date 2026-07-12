import { Response } from "express";
import { HTTP_STATUS } from "../../constants/httpStatus";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/apiResponse";
import { getActor } from "../common/request-context";
import { auditService } from "./audit.service";

export const listAudits = asyncHandler(async (req: AuthenticatedRequest, res: Response) => sendSuccess(res, HTTP_STATUS.OK, "Audit cycles retrieved", await auditService.list(req.query)));
export const getAudit = asyncHandler(async (req: AuthenticatedRequest, res: Response) => sendSuccess(res, HTTP_STATUS.OK, "Audit cycle retrieved", await auditService.get(String(req.params.id))));
export const createAudit = asyncHandler(async (req: AuthenticatedRequest, res: Response) => sendSuccess(res, HTTP_STATUS.CREATED, "Audit cycle created", await auditService.create(req.body, getActor(req))));
export const verifyAuditItem = asyncHandler(async (req: AuthenticatedRequest, res: Response) => sendSuccess(res, HTTP_STATUS.OK, "Audit item verified", await auditService.verifyItem(String(req.params.id), String(req.params.itemId), req.body, getActor(req))));
export const closeAudit = asyncHandler(async (req: AuthenticatedRequest, res: Response) => sendSuccess(res, HTTP_STATUS.OK, "Audit cycle closed", await auditService.close(String(req.params.id), getActor(req))));
export const auditDiscrepancies = asyncHandler(async (req: AuthenticatedRequest, res: Response) => sendSuccess(res, HTTP_STATUS.OK, "Audit discrepancies retrieved", await auditService.discrepancyReport(String(req.params.id))));
