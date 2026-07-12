import { Response } from "express";
import { HTTP_STATUS } from "../../constants/httpStatus";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/apiResponse";
import { getActor } from "../common/request-context";
import { bookingService } from "./booking.service";

export const listBookings = asyncHandler(async (req: AuthenticatedRequest, res: Response) => sendSuccess(res, HTTP_STATUS.OK, "Bookings retrieved", await bookingService.list(req.query, getActor(req))));
export const createBooking = asyncHandler(async (req: AuthenticatedRequest, res: Response) => sendSuccess(res, HTTP_STATUS.CREATED, "Booking created", await bookingService.create(req.body, getActor(req))));
export const cancelBooking = asyncHandler(async (req: AuthenticatedRequest, res: Response) => sendSuccess(res, HTTP_STATUS.OK, "Booking cancelled", await bookingService.cancel(String(req.params.id), getActor(req))));
export const rescheduleBooking = asyncHandler(async (req: AuthenticatedRequest, res: Response) => sendSuccess(res, HTTP_STATUS.OK, "Booking rescheduled", await bookingService.reschedule(String(req.params.id), req.body, getActor(req))));
