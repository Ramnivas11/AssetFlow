import { AssetStatus, AuditResult, AuditStatus, Prisma } from "@prisma/client";

import { HTTP_STATUS } from "../../constants/httpStatus";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { buildPaginationMeta, normalizePagination } from "../../utils/pagination";
import { assertAssetTransition } from "../assets/asset-lifecycle.service";

export class AuditService {
    async list(input: Record<string, any>) {
        const pagination = normalizePagination(input);
        const where = { status: input.status } satisfies Prisma.AuditCycleWhereInput;
        const [items, total] = await prisma.$transaction([
            prisma.auditCycle.findMany({ where, skip: pagination.skip, take: pagination.take, orderBy: { createdAt: "desc" }, include: { department: true, _count: { select: { auditItems: true } } } }),
            prisma.auditCycle.count({ where }),
        ]);
        return { items, meta: buildPaginationMeta(pagination.page, pagination.limit, total) };
    }

    async get(id: string) {
        const cycle = await prisma.auditCycle.findUnique({ where: { id }, include: { auditItems: { include: { asset: true, auditor: { select: { id: true, name: true } } } } } });
        if (!cycle) throw new AppError("Audit cycle not found", HTTP_STATUS.NOT_FOUND);
        return cycle;
    }

    async create(input: any, actor: any) {
        const assets = await prisma.asset.findMany({ where: { deletedAt: null, departmentId: input.departmentId }, select: { id: true } });
        return prisma.$transaction(async (tx) => {
            const cycle = await tx.auditCycle.create({ data: { title: input.title, scope: input.scope, departmentId: input.departmentId, startDate: input.startDate, endDate: input.endDate, status: AuditStatus.IN_PROGRESS, createdById: actor.userId } });
            const items = assets.flatMap((asset) => input.auditorIds.map((auditorId: string) => ({ auditCycleId: cycle.id, assetId: asset.id, auditorId })));
            if (items.length) await tx.auditItem.createMany({ data: items });
            for (const auditorId of input.auditorIds) await tx.notification.create({ data: { userId: auditorId, title: "Audit assigned", message: `${cycle.title} has been assigned to you`, type: "TASK_ASSIGNED", metadata: { auditCycleId: cycle.id } } });
            await tx.activityLog.create({ data: this.logData(actor, "AUDIT_CREATED", cycle.id, { itemCount: items.length }) });
            return cycle;
        });
    }

    async verifyItem(cycleId: string, itemId: string, input: any, actor: any) {
        const item = await prisma.auditItem.findFirst({ where: { id: itemId, auditCycleId: cycleId }, include: { auditCycle: true } });
        if (!item || item.auditCycle.status !== AuditStatus.IN_PROGRESS) throw new AppError("Open audit item not found", HTTP_STATUS.NOT_FOUND);
        if (item.auditorId !== actor.userId) throw new AppError("Only the assigned auditor can verify this item", HTTP_STATUS.FORBIDDEN);
        const updated = await prisma.auditItem.update({ where: { id: itemId }, data: { result: input.result, remarks: input.remarks, verifiedAt: new Date() } });
        await prisma.activityLog.create({ data: this.logData(actor, "AUDIT_ITEM_VERIFIED", itemId, input) });
        return updated;
    }

    async close(id: string, actor: any) {
        const cycle = await this.get(id);
        if (cycle.status !== AuditStatus.IN_PROGRESS) throw new AppError("Only in-progress audit cycles can be closed", HTTP_STATUS.BAD_REQUEST);
        return prisma.$transaction(async (tx) => {
            for (const item of cycle.auditItems.filter((entry) => entry.result === AuditResult.MISSING)) {
                assertAssetTransition(item.asset.status, AssetStatus.LOST);
                await tx.asset.update({ where: { id: item.assetId }, data: { status: AssetStatus.LOST } });
            }
            const closed = await tx.auditCycle.update({ where: { id }, data: { status: AuditStatus.COMPLETED } });
            await tx.activityLog.create({ data: this.logData(actor, "AUDIT_CLOSED", id, {}) });
            return closed;
        });
    }

    async discrepancyReport(id: string) {
        await this.get(id);
        return prisma.auditItem.findMany({ where: { auditCycleId: id, result: { in: [AuditResult.MISSING, AuditResult.DAMAGED, AuditResult.MISMATCH] } }, include: { asset: true, auditor: { select: { id: true, name: true } } } });
    }

    private logData(actor: any, action: string, entityId: string, metadata: object) {
        return { userId: actor.userId, action, entityType: "AuditCycle", entityId, ipAddress: actor.ipAddress, userAgent: actor.userAgent, metadata };
    }
}

export const auditService = new AuditService();
