import { AllocationStatus, Role } from "@prisma/client";
import { Router } from "express";

import { HTTP_STATUS } from "../../constants/httpStatus";
import { authenticate, authorize } from "../../middlewares/auth.middleware";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/apiResponse";
import { prisma } from "../../lib/prisma";

const router = Router();
router.use(authenticate);

router.get("/asset-utilization", authorize(Role.ADMIN, Role.ASSET_MANAGER), asyncHandler(async (_req, res) => {
    const items = await prisma.asset.findMany({ where: { deletedAt: null }, select: { id: true, assetTag: true, name: true, status: true, _count: { select: { allocations: true, bookings: true, maintenance: true } } }, orderBy: { createdAt: "desc" } });
    return sendSuccess(res, HTTP_STATUS.OK, "Asset utilization report retrieved", items);
}));

router.get("/department-allocation", authorize(Role.ADMIN, Role.ASSET_MANAGER), asyncHandler(async (_req, res) => {
    const items = await prisma.department.findMany({ where: { deletedAt: null }, select: { id: true, name: true, code: true, _count: { select: { assets: true, employees: true, allocations: true } } }, orderBy: { name: "asc" } });
    return sendSuccess(res, HTTP_STATUS.OK, "Department allocation report retrieved", items);
}));

router.get("/department-allocation.csv", authorize(Role.ADMIN, Role.ASSET_MANAGER), asyncHandler(async (_req, res) => {
    const rows = await prisma.department.findMany({ where: { deletedAt: null }, select: { name: true, code: true, _count: { select: { assets: true, employees: true, allocations: true } } }, orderBy: { name: "asc" } });
    const csv = ["name,code,assets,employees,allocations", ...rows.map((row) => [row.name, row.code, row._count.assets, row._count.employees, row._count.allocations].join(","))].join("\n");
    res.header("Content-Type", "text/csv");
    res.header("Content-Disposition", "attachment; filename=department-allocation.csv");
    return res.status(HTTP_STATUS.OK).send(csv);
}));

router.get("/maintenance-frequency", authorize(Role.ADMIN, Role.ASSET_MANAGER), asyncHandler(async (_req, res) => {
    const items = await prisma.maintenanceRequest.groupBy({ by: ["assetId", "priority"], _count: true });
    return sendSuccess(res, HTTP_STATUS.OK, "Maintenance frequency report retrieved", items);
}));

router.get("/booking-heatmap", authorize(Role.ADMIN, Role.ASSET_MANAGER), asyncHandler(async (_req, res) => {
    const bookings = await prisma.booking.findMany({ select: { startTime: true } });
    const heatmap = bookings.reduce<Record<string, number>>((acc, booking) => {
        const key = `${booking.startTime.getDay()}-${booking.startTime.getHours()}`;
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
    }, {});
    return sendSuccess(res, HTTP_STATUS.OK, "Booking heatmap report retrieved", heatmap);
}));

router.get("/idle-assets", authorize(Role.ADMIN, Role.ASSET_MANAGER), asyncHandler(async (_req, res) => {
    const items = await prisma.asset.findMany({ where: { deletedAt: null, status: "AVAILABLE", allocations: { none: { allocationStatus: AllocationStatus.ACTIVE } } }, orderBy: { createdAt: "asc" } });
    return sendSuccess(res, HTTP_STATUS.OK, "Idle assets report retrieved", items);
}));

router.get("/near-retirement", authorize(Role.ADMIN, Role.ASSET_MANAGER), asyncHandler(async (_req, res) => {
    const threshold = new Date();
    threshold.setFullYear(threshold.getFullYear() - 4);
    const items = await prisma.asset.findMany({ where: { deletedAt: null, purchaseDate: { lte: threshold }, status: { notIn: ["RETIRED", "DISPOSED"] } }, orderBy: { purchaseDate: "asc" } });
    return sendSuccess(res, HTTP_STATUS.OK, "Near retirement assets retrieved", items);
}));

router.get("/overdue-returns", authorize(Role.ADMIN, Role.ASSET_MANAGER), asyncHandler(async (_req, res) => {
    const items = await prisma.allocationRecord.findMany({ where: { allocationStatus: AllocationStatus.ACTIVE, expectedReturnDate: { lt: new Date() } }, include: { asset: true, employee: { select: { id: true, name: true, email: true } } } });
    return sendSuccess(res, HTTP_STATUS.OK, "Overdue returns report retrieved", items);
}));

export default router;
