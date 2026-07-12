import { Response } from "express";

import { HTTP_STATUS } from "../../constants/httpStatus";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/apiResponse";
import { getActor } from "../common/request-context";
import { assetService } from "./asset.service";

export const listAssets = asyncHandler(async (req: AuthenticatedRequest, res: Response) => sendSuccess(res, HTTP_STATUS.OK, "Assets retrieved", await assetService.list(req.query, getActor(req))));
export const getAsset = asyncHandler(async (req: AuthenticatedRequest, res: Response) => sendSuccess(res, HTTP_STATUS.OK, "Asset retrieved", await assetService.get(String(req.params.id), getActor(req))));
export const createAsset = asyncHandler(async (req: AuthenticatedRequest, res: Response) => sendSuccess(res, HTTP_STATUS.CREATED, "Asset created", await assetService.create(req.body, getActor(req))));
export const updateAsset = asyncHandler(async (req: AuthenticatedRequest, res: Response) => sendSuccess(res, HTTP_STATUS.OK, "Asset updated", await assetService.update(String(req.params.id), req.body, getActor(req))));
export const deactivateAsset = asyncHandler(async (req: AuthenticatedRequest, res: Response) => sendSuccess(res, HTTP_STATUS.OK, "Asset deactivated", await assetService.deactivate(String(req.params.id), getActor(req))));
export const bulkAssetStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => sendSuccess(res, HTTP_STATUS.OK, "Assets updated", await assetService.bulkStatus(req.body, getActor(req))));
