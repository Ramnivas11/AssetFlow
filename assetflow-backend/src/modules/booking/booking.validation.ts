import { BookingStatus } from "@prisma/client";
import { z } from "zod";

const cuid = z.string().cuid();

export const bookingListSchema = z.object({
    query: z.object({
        page: z.coerce.number().int().positive().optional(),
        limit: z.coerce.number().int().positive().max(100).optional(),
        assetId: cuid.optional(),
        status: z.enum(BookingStatus).optional(),
        from: z.coerce.date().optional(),
        to: z.coerce.date().optional(),
    }),
});

export const createBookingSchema = z.object({
    body: z.object({
        assetId: cuid,
        startTime: z.coerce.date(),
        endTime: z.coerce.date(),
        title: z.string().trim().min(2).max(160),
        description: z.string().trim().max(1000).optional(),
    }).refine((value) => value.endTime > value.startTime, "Booking end time must be after start time"),
});

export const bookingIdSchema = z.object({ params: z.object({ id: cuid }) });

export const rescheduleBookingSchema = z.object({
    params: z.object({ id: cuid }),
    body: z.object({ startTime: z.coerce.date(), endTime: z.coerce.date() }).refine((value) => value.endTime > value.startTime, "Booking end time must be after start time"),
});
