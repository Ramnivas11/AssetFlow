import { AllocationStatus, BookingStatus, MaintenanceStatus, Role, TransferStatus } from "@prisma/client";
import { Router } from "express";

import { HTTP_STATUS } from "../../constants/httpStatus";
import { authenticate, authorize } from "../../middlewares/auth.middleware";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/apiResponse";
import { prisma } from "../../lib/prisma";

const router = Router();
router.use(authenticate);
router.get("/", authorize(Role.ADMIN, Role.ASSET_MANAGER, Role.DEPARTMENT_HEAD), asyncHandler(async (_req, res) => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);
    const now = new Date();
    const [
        availableAssets,
        allocatedAssets,
        maintenanceToday,
        upcomingReturns,
        overdueReturns,
        pendingTransfers,
        pendingMaintenance,
        activeBookings,
        recentActivities,
        departmentSummary,
    ] = await prisma.$transaction([
        prisma.asset.count({ where: { deletedAt: null, status: "AVAILABLE" } }),
        prisma.asset.count({ where: { deletedAt: null, status: "ALLOCATED" } }),
        prisma.maintenanceRequest.count({ where: { updatedAt: { gte: todayStart, lt: todayEnd }, status: { in: [MaintenanceStatus.APPROVED, MaintenanceStatus.IN_PROGRESS] } } }),
        prisma.allocationRecord.findMany({ where: { allocationStatus: AllocationStatus.ACTIVE, expectedReturnDate: { gte: now } }, take: 10, orderBy: { expectedReturnDate: "asc" }, include: { asset: true, employee: { select: { id: true, name: true } } } }),
        prisma.allocationRecord.findMany({ where: { allocationStatus: AllocationStatus.ACTIVE, expectedReturnDate: { lt: now } }, take: 10, orderBy: { expectedReturnDate: "asc" }, include: { asset: true, employee: { select: { id: true, name: true } } } }),
        prisma.transferRequest.count({ where: { status: TransferStatus.PENDING } }),
        prisma.maintenanceRequest.count({ where: { status: MaintenanceStatus.PENDING } }),
        prisma.booking.count({ where: { status: { in: [BookingStatus.PENDING, BookingStatus.APPROVED, BookingStatus.ACTIVE] }, endTime: { gte: now } } }),
        prisma.activityLog.findMany({ take: 10, orderBy: { createdAt: "desc" } }),
        prisma.department.findMany({ where: { deletedAt: null }, select: { id: true, name: true, _count: { select: { assets: true, employees: true } } } }),
    ]);
    return sendSuccess(res, HTTP_STATUS.OK, "Dashboard retrieved", { availableAssets, allocatedAssets, maintenanceToday, upcomingReturns, overdueReturns, pendingTransfers, pendingMaintenance, activeBookings, recentActivities, departmentSummary });
}));

export default router;
