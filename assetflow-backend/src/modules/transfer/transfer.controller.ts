import { Response } from "express";
import { HTTP_STATUS } from "../../constants/httpStatus";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/apiResponse";
import { getActor } from "../common/request-context";
import { transferService } from "./transfer.service";

export const listTransfers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => sendSuccess(res, HTTP_STATUS.OK, "Transfers retrieved", await transferService.list(req.query)));
export const createTransfer = asyncHandler(async (req: AuthenticatedRequest, res: Response) => sendSuccess(res, HTTP_STATUS.CREATED, "Transfer requested", await transferService.create(req.body, getActor(req))));
export const decideTransfer = asyncHandler(async (req: AuthenticatedRequest, res: Response) => sendSuccess(res, HTTP_STATUS.OK, "Transfer updated", await transferService.decide(String(req.params.id), req.body, getActor(req))));
