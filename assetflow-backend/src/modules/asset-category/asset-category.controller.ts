import { Response } from "express";

import { HTTP_STATUS } from "../../constants/httpStatus";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/apiResponse";
import { getActor } from "../common/request-context";
import { assetCategoryService } from "./asset-category.service";

export const listCategories = asyncHandler(async (req: AuthenticatedRequest, res: Response) => sendSuccess(res, HTTP_STATUS.OK, "Asset categories retrieved", await assetCategoryService.list(req.query)));
export const getCategory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => sendSuccess(res, HTTP_STATUS.OK, "Asset category retrieved", await assetCategoryService.get(String(req.params.id))));
export const createCategory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => sendSuccess(res, HTTP_STATUS.CREATED, "Asset category created", await assetCategoryService.create(req.body, getActor(req))));
export const updateCategory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => sendSuccess(res, HTTP_STATUS.OK, "Asset category updated", await assetCategoryService.update(String(req.params.id), req.body, getActor(req))));
export const deactivateCategory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => sendSuccess(res, HTTP_STATUS.OK, "Asset category deactivated", await assetCategoryService.deactivate(String(req.params.id), getActor(req))));
