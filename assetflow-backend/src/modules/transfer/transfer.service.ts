import { AllocationStatus, AssetStatus, Prisma, TransferStatus } from "@prisma/client";

import { HTTP_STATUS } from "../../constants/httpStatus";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { buildPaginationMeta, normalizePagination } from "../../utils/pagination";

export class TransferService {
    async list(input: Record<string, any>) {
        const pagination = normalizePagination(input);
        const where = { status: input.status } satisfies Prisma.TransferRequestWhereInput;
        const [items, total] = await prisma.$transaction([
            prisma.transferRequest.findMany({ where, skip: pagination.skip, take: pagination.take, orderBy: { createdAt: "desc" }, include: { asset: true, requestedBy: { select: { id: true, name: true } }, targetEmployee: { select: { id: true, name: true } }, targetDepartment: { select: { id: true, name: true } } } }),
            prisma.transferRequest.count({ where }),
        ]);
        return { items, meta: buildPaginationMeta(pagination.page, pagination.limit, total) };
    }

    async create(input: any, actor: any) {
        const active = await prisma.allocationRecord.findFirst({ where: { assetId: input.assetId, allocationStatus: AllocationStatus.ACTIVE } });
        const request = await prisma.transferRequest.create({ data: { ...input, requestedById: actor.userId, currentHolderId: active?.employeeId ?? null }, include: { asset: true } });
        await prisma.activityLog.create({ data: this.logData(actor, "TRANSFER_REQUESTED", request.id, input) });
        return request;
    }

    async decide(id: string, input: any, actor: any) {
        const request = await prisma.transferRequest.findUnique({ where: { id }, include: { asset: true } });
        if (!request || request.status !== TransferStatus.PENDING) throw new AppError("Pending transfer request not found", HTTP_STATUS.NOT_FOUND);
        if (request.requestedById === actor.userId) throw new AppError("You cannot approve your own transfer request", HTTP_STATUS.FORBIDDEN);
        if (input.decision === "REJECT") {
            const rejected = await prisma.transferRequest.update({ where: { id }, data: { status: TransferStatus.REJECTED, approvedById: actor.userId } });
            await prisma.activityLog.create({ data: this.logData(actor, "TRANSFER_REJECTED", id, {}) });
            await prisma.notification.create({ data: { userId: request.requestedById, title: "Transfer rejected", message: `${request.asset.assetTag} transfer request was rejected`, type: "WARNING", metadata: { transferRequestId: id } } });
            return rejected;
        }
        return prisma.$transaction(async (tx) => {
            await tx.allocationRecord.updateMany({ where: { assetId: request.assetId, allocationStatus: AllocationStatus.ACTIVE }, data: { allocationStatus: AllocationStatus.RETURNED, returnedAt: new Date(), returnNotes: "Transferred" } });
            const allocation = await tx.allocationRecord.create({ data: { assetId: request.assetId, employeeId: request.targetEmployeeId, departmentId: request.targetDepartmentId, allocatedById: actor.userId } });
            await tx.asset.update({ where: { id: request.assetId }, data: { status: AssetStatus.ALLOCATED } });
            const approved = await tx.transferRequest.update({ where: { id }, data: { status: TransferStatus.APPROVED, approvedById: actor.userId } });
            await tx.activityLog.create({ data: this.logData(actor, "TRANSFER_APPROVED", id, { allocationId: allocation.id }) });
            await tx.notification.create({ data: { userId: request.requestedById, title: "Transfer approved", message: `${request.asset.assetTag} transfer request was approved`, type: "TASK_ASSIGNED", metadata: { transferRequestId: id } } });
            return approved;
        });
    }

    private logData(actor: any, action: string, entityId: string, metadata: object) {
        return { userId: actor.userId, action, entityType: "TransferRequest", entityId, ipAddress: actor.ipAddress, userAgent: actor.userAgent, metadata };
    }
}

export const transferService = new TransferService();
