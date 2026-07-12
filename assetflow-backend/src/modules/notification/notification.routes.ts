import { NotificationType, Role } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";

import { HTTP_STATUS } from "../../constants/httpStatus";
import { authenticate, authorize, AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/apiResponse";
import { buildPaginationMeta, normalizePagination } from "../../utils/pagination";
import { prisma } from "../../lib/prisma";

const listSchema = z.object({
    query: z.object({
        page: z.coerce.number().int().positive().optional(),
        limit: z.coerce.number().int().positive().max(100).optional(),
        read: z.coerce.boolean().optional(),
        type: z.enum(NotificationType).optional(),
    }),
});
const idSchema = z.object({ params: z.object({ id: z.string().cuid() }) });

const router = Router();
router.use(authenticate);

router.get("/", authorize(Role.ADMIN, Role.ASSET_MANAGER, Role.DEPARTMENT_HEAD, Role.EMPLOYEE), validate(listSchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
    const pagination = normalizePagination(req.query);
    const where = { userId: req.auth!.userId, read: req.query.read as any, type: req.query.type as any };
    const [items, total] = await prisma.$transaction([
        prisma.notification.findMany({ where, skip: pagination.skip, take: pagination.take, orderBy: { createdAt: "desc" } }),
        prisma.notification.count({ where }),
    ]);
    return sendSuccess(res, HTTP_STATUS.OK, "Notifications retrieved", { items, meta: buildPaginationMeta(pagination.page, pagination.limit, total) });
}));

router.patch("/:id/read", authorize(Role.ADMIN, Role.ASSET_MANAGER, Role.DEPARTMENT_HEAD, Role.EMPLOYEE), validate(idSchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
    const existing = await prisma.notification.findFirstOrThrow({ where: { id: String(req.params.id), userId: req.auth!.userId } });
    const item = await prisma.notification.update({ where: { id: existing.id }, data: { read: true } });
    return sendSuccess(res, HTTP_STATUS.OK, "Notification marked as read", item);
}));

export default router;
