import { AssetStatus, MaintenanceStatus, Prisma, Role } from "@prisma/client";

import { HTTP_STATUS } from "../../constants/httpStatus";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { buildPaginationMeta, normalizePagination } from "../../utils/pagination";
import { assertAssetTransition } from "../assets/asset-lifecycle.service";

export class MaintenanceService {
    async list(input: Record<string, any>, actor: any) {
        const pagination = normalizePagination(input);
        const where: Prisma.MaintenanceRequestWhereInput = { assetId: input.assetId, status: input.status, priority: input.priority, requestedById: actor.role === Role.EMPLOYEE ? actor.userId : undefined };
        const [items, total] = await prisma.$transaction([
            prisma.maintenanceRequest.findMany({ where, skip: pagination.skip, take: pagination.take, orderBy: { createdAt: "desc" }, include: { asset: true, requestedBy: { select: { id: true, name: true } }, approvedBy: { select: { id: true, name: true } }, technician: { select: { id: true, name: true } } } }),
            prisma.maintenanceRequest.count({ where }),
        ]);
        return { items, meta: buildPaginationMeta(pagination.page, pagination.limit, total) };
    }

    async create(input: any, actor: any) {
        const asset = await prisma.asset.findFirst({ where: { id: input.assetId, deletedAt: null } });
        if (!asset) throw new AppError("Asset not found", HTTP_STATUS.NOT_FOUND);
        return prisma.$transaction(async (tx) => {
            const request = await tx.maintenanceRequest.create({ data: { assetId: input.assetId, requestedById: actor.userId, issue: input.issue, priority: input.priority, conditionBefore: input.conditionBefore, estimatedCost: input.estimatedCost === undefined ? undefined : new Prisma.Decimal(input.estimatedCost) } });
            if (input.attachments?.length) await tx.document.createMany({ data: input.attachments.map((doc: any) => ({ ...doc, entityType: "MaintenanceRequest", entityId: request.id, uploadedById: actor.userId })) });
            await tx.activityLog.create({ data: this.logData(actor, "MAINTENANCE_REQUESTED", request.id, { assetId: input.assetId }) });
            return request;
        });
    }

    async decide(id: string, input: any, actor: any) {
        const request = await prisma.maintenanceRequest.findUnique({ where: { id }, include: { asset: true } });
        if (!request || request.status !== MaintenanceStatus.PENDING) throw new AppError("Pending maintenance request not found", HTTP_STATUS.NOT_FOUND);
        if (request.requestedById === actor.userId) throw new AppError("Employees cannot approve their own maintenance requests", HTTP_STATUS.FORBIDDEN);
        if (input.decision === "REJECT") return this.reject(request.id, request.requestedById, actor);
        assertAssetTransition(request.asset.status, AssetStatus.UNDER_MAINTENANCE);
        return prisma.$transaction(async (tx) => {
            const updated = await tx.maintenanceRequest.update({ where: { id }, data: { status: MaintenanceStatus.APPROVED, approvedById: actor.userId, technicianId: input.technicianId } });
            await tx.asset.update({ where: { id: request.assetId }, data: { status: AssetStatus.UNDER_MAINTENANCE } });
            await tx.activityLog.create({ data: this.logData(actor, "MAINTENANCE_APPROVED", id, {}) });
            await tx.notification.create({ data: { userId: request.requestedById, title: "Maintenance approved", message: "Your maintenance request was approved", type: "TASK_ASSIGNED", metadata: { maintenanceRequestId: id } } });
            return updated;
        });
    }

    async updateStatus(id: string, input: any, actor: any) {
        const request = await prisma.maintenanceRequest.findUnique({ where: { id }, include: { asset: true } });
        if (!request) throw new AppError("Maintenance request not found", HTTP_STATUS.NOT_FOUND);
        if (input.status === MaintenanceStatus.RESOLVED) assertAssetTransition(request.asset.status, AssetStatus.AVAILABLE);
        return prisma.$transaction(async (tx) => {
            const updated = await tx.maintenanceRequest.update({ where: { id }, data: { status: input.status, resolution: input.resolution, conditionAfter: input.conditionAfter, actualCost: input.actualCost === undefined ? undefined : new Prisma.Decimal(input.actualCost) } });
            if (input.status === MaintenanceStatus.RESOLVED) await tx.asset.update({ where: { id: request.assetId }, data: { status: AssetStatus.AVAILABLE, currentCondition: input.conditionAfter ?? request.asset.currentCondition } });
            await tx.activityLog.create({ data: this.logData(actor, `MAINTENANCE_${input.status}`, id, input) });
            return updated;
        });
    }

    private async reject(id: string, requestedById: string, actor: any) {
        return prisma.$transaction(async (tx) => {
            const updated = await tx.maintenanceRequest.update({ where: { id }, data: { status: MaintenanceStatus.CANCELLED, approvedById: actor.userId } });
            await tx.activityLog.create({ data: this.logData(actor, "MAINTENANCE_REJECTED", id, {}) });
            await tx.notification.create({ data: { userId: requestedById, title: "Maintenance rejected", message: "Your maintenance request was rejected", type: "WARNING", metadata: { maintenanceRequestId: id } } });
            return updated;
        });
    }

    private logData(actor: any, action: string, entityId: string, metadata: object) {
        return { userId: actor.userId, action, entityType: "MaintenanceRequest", entityId, ipAddress: actor.ipAddress, userAgent: actor.userAgent, metadata };
    }
}

export const maintenanceService = new MaintenanceService();
