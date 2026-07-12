import { BookingStatus, Prisma, Role } from "@prisma/client";

import { HTTP_STATUS } from "../../constants/httpStatus";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { buildPaginationMeta, normalizePagination } from "../../utils/pagination";

const activeBookingStatuses = [BookingStatus.PENDING, BookingStatus.APPROVED, BookingStatus.ACTIVE];

export class BookingService {
    async list(input: Record<string, any>, actor: any) {
        const pagination = normalizePagination(input);
        const where: Prisma.BookingWhereInput = {
            assetId: input.assetId,
            status: input.status,
            bookedById: actor.role === Role.EMPLOYEE ? actor.userId : undefined,
            startTime: input.from || input.to ? { gte: input.from, lte: input.to } : undefined,
        };
        const [items, total] = await prisma.$transaction([
            prisma.booking.findMany({ where, skip: pagination.skip, take: pagination.take, orderBy: { startTime: "asc" }, include: { asset: true, bookedBy: { select: { id: true, name: true } } } }),
            prisma.booking.count({ where }),
        ]);
        return { items, meta: buildPaginationMeta(pagination.page, pagination.limit, total) };
    }

    async create(input: any, actor: any) {
        const asset = await prisma.asset.findFirst({ where: { id: input.assetId, deletedAt: null } });
        if (!asset) throw new AppError("Asset not found", HTTP_STATUS.NOT_FOUND);
        if (!asset.isBookable) throw new AppError("Asset is not bookable", HTTP_STATUS.BAD_REQUEST);
        if (["UNDER_MAINTENANCE", "LOST", "RETIRED", "DISPOSED"].includes(asset.status)) throw new AppError("Asset cannot be booked in its current status", HTTP_STATUS.BAD_REQUEST);

        await this.assertNoOverlap(input.assetId, input.startTime, input.endTime);
        try {
            const booking = await prisma.booking.create({ data: { ...input, bookedById: actor.userId, status: BookingStatus.APPROVED }, include: { asset: true } });
            await prisma.activityLog.create({ data: this.logData(actor, "BOOKING_CREATED", booking.id, input) });
            await prisma.notification.create({ data: { userId: actor.userId, title: "Booking confirmed", message: `${asset.assetTag} is booked`, type: "INFO", metadata: { bookingId: booking.id } } });
            return booking;
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && String(error.message).includes("Booking_no_overlapping_active_bookings")) {
                await this.throwOverlap(input.assetId, input.startTime, input.endTime);
            }
            throw error;
        }
    }

    async cancel(id: string, actor: any) {
        const booking = await prisma.booking.findUnique({ where: { id } });
        if (!booking) throw new AppError("Booking not found", HTTP_STATUS.NOT_FOUND);
        const updated = await prisma.booking.update({ where: { id }, data: { status: BookingStatus.CANCELLED } });
        await prisma.activityLog.create({ data: this.logData(actor, "BOOKING_CANCELLED", id, {}) });
        await prisma.notification.create({ data: { userId: booking.bookedById, title: "Booking cancelled", message: "Your booking was cancelled", type: "WARNING", metadata: { bookingId: id } } });
        return updated;
    }

    async reschedule(id: string, input: any, actor: any) {
        const booking = await prisma.booking.findUnique({ where: { id } });
        if (!booking) throw new AppError("Booking not found", HTTP_STATUS.NOT_FOUND);
        await this.assertNoOverlap(booking.assetId, input.startTime, input.endTime, id);
        const updated = await prisma.booking.update({ where: { id }, data: input });
        await prisma.activityLog.create({ data: this.logData(actor, "BOOKING_RESCHEDULED", id, input) });
        return updated;
    }

    private async assertNoOverlap(assetId: string, startTime: Date, endTime: Date, excludeId?: string) {
        const conflict = await prisma.booking.findFirst({
            where: {
                id: excludeId ? { not: excludeId } : undefined,
                assetId,
                status: { in: activeBookingStatuses },
                startTime: { lt: endTime },
                endTime: { gt: startTime },
            },
        });
        if (conflict) throw new AppError(`Booking conflicts with existing booking from ${conflict.startTime.toISOString()} to ${conflict.endTime.toISOString()}`, HTTP_STATUS.CONFLICT);
    }

    private async throwOverlap(assetId: string, startTime: Date, endTime: Date): Promise<never> {
        await this.assertNoOverlap(assetId, startTime, endTime);
        throw new AppError("Booking conflicts with an existing booking", HTTP_STATUS.CONFLICT);
    }

    private logData(actor: any, action: string, entityId: string, metadata: object) {
        return { userId: actor.userId, action, entityType: "Booking", entityId, ipAddress: actor.ipAddress, userAgent: actor.userAgent, metadata };
    }
}

export const bookingService = new BookingService();
