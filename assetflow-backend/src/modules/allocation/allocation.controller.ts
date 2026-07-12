import { Response } from "express";

import { HTTP_STATUS } from "../../constants/httpStatus";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/apiResponse";
import { getActor } from "../common/request-context";
import { allocationService } from "./allocation.service";

export const listAllocations = asyncHandler(async (req: AuthenticatedRequest, res: Response) => sendSuccess(res, HTTP_STATUS.OK, "Allocations retrieved", await allocationService.list(req.query, getActor(req))));
export const allocateAsset = asyncHandler(async (req: AuthenticatedRequest, res: Response) => sendSuccess(res, HTTP_STATUS.CREATED, "Asset allocated", await allocationService.allocate(req.body, getActor(req))));
export const returnAsset = asyncHandler(async (req: AuthenticatedRequest, res: Response) => sendSuccess(res, HTTP_STATUS.OK, "Asset returned", await allocationService.returnAllocation(String(req.params.id), req.body, getActor(req))));
