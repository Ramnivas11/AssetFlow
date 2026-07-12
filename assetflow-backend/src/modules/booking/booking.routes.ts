import { Role } from "@prisma/client";
import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { cancelBooking, createBooking, listBookings, rescheduleBooking } from "./booking.controller";
import { bookingIdSchema, bookingListSchema, createBookingSchema, rescheduleBookingSchema } from "./booking.validation";

const router = Router();
router.use(authenticate);
router.get("/", authorize(Role.ADMIN, Role.ASSET_MANAGER, Role.DEPARTMENT_HEAD, Role.EMPLOYEE), validate(bookingListSchema), listBookings);
router.post("/", authorize(Role.ADMIN, Role.ASSET_MANAGER, Role.DEPARTMENT_HEAD, Role.EMPLOYEE), validate(createBookingSchema), createBooking);
router.patch("/:id/reschedule", authorize(Role.ADMIN, Role.ASSET_MANAGER, Role.DEPARTMENT_HEAD, Role.EMPLOYEE), validate(rescheduleBookingSchema), rescheduleBooking);
router.patch("/:id/cancel", authorize(Role.ADMIN, Role.ASSET_MANAGER, Role.DEPARTMENT_HEAD, Role.EMPLOYEE), validate(bookingIdSchema), cancelBooking);
export default router;
