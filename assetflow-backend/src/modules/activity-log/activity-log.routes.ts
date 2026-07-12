import { Role } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";

import { HTTP_STATUS } from "../../constants/httpStatus";
import { authenticate, authorize } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/apiResponse";
import { buildPaginationMeta, normalizePagination } from "../../utils/pagination";
import { prisma } from "../../lib/prisma";

const listSchema = z.object({
    query: z.object({
        page: z.coerce.number().int().positive().optional(),
        limit: z.coerce.number().int().positive().max(100).optional(),
        entityType: z.string().trim().min(1).optional(),
        entityId: z.string().trim().min(1).optional(),
        userId: z.string().cuid().optional(),
        from: z.coerce.date().optional(),
        to: z.coerce.date().optional(),
    }),
});

const router = Router();
router.use(authenticate);
router.get("/", authorize(Role.ADMIN, Role.ASSET_MANAGER), validate(listSchema), asyncHandler(async (req, res) => {
    const pagination = normalizePagination(req.query);
    const where = {
        entityType: req.query.entityType as any,
        entityId: req.query.entityId as any,
        userId: req.query.userId as any,
        createdAt: req.query.from || req.query.to ? { gte: req.query.from as any, lte: req.query.to as any } : undefined,
    };
    const [items, total] = await prisma.$transaction([
        prisma.activityLog.findMany({ where, skip: pagination.skip, take: pagination.take, orderBy: { createdAt: "desc" }, include: { user: { select: { id: true, name: true, email: true } } } }),
        prisma.activityLog.count({ where }),
    ]);
    return sendSuccess(res, HTTP_STATUS.OK, "Activity logs retrieved", { items, meta: buildPaginationMeta(pagination.page, pagination.limit, total) });
}));

export default router;
