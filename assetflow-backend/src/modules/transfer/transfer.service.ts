import { AllocationStatus, AssetStatus, Prisma, TransferStatus, Role } from "@prisma/client";

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
        return prisma.$transaction(async (tx) => {
            const request = await tx.transferRequest.create({ data: { ...input, requestedById: actor.userId, currentHolderId: active?.employeeId ?? null }, include: { asset: true } });
            await tx.activityLog.create({ data: this.logData(actor, "TRANSFER_REQUESTED", request.id, input) });
            return request;
        });
    }

    async decide(id: string, input: any, actor: any) {
        const request = await prisma.transferRequest.findUnique({ where: { id }, include: { asset: true } });
        if (!request) throw new AppError("Transfer request not found", HTTP_STATUS.NOT_FOUND);
        
        if (request.status === TransferStatus.APPROVED) {
            if (actor.role !== Role.ADMIN && actor.role !== Role.ASSET_MANAGER) {
                throw new AppError("Only Asset Managers can allocate approved requests", HTTP_STATUS.FORBIDDEN);
            }
        } else if (request.status !== TransferStatus.PENDING) {
            throw new AppError("Transfer request must be pending or approved", HTTP_STATUS.BAD_REQUEST);
        }

        if (request.requestedById === actor.userId) throw new AppError("You cannot approve your own transfer request", HTTP_STATUS.FORBIDDEN);
        
        if (input.decision === "REJECT") {
            return prisma.$transaction(async (tx) => {
                const rejected = await tx.transferRequest.update({ where: { id }, data: { status: TransferStatus.REJECTED, approvedById: actor.userId } });
                await tx.activityLog.create({ data: this.logData(actor, "TRANSFER_REJECTED", id, {}) });
                await tx.notification.create({ data: { userId: request.requestedById, title: "Transfer rejected", message: `${request.asset.assetTag} transfer request was rejected`, type: "WARNING", metadata: { transferRequestId: id } } });
                return rejected;
            });
        }

        // If actor is a Department Head and request is PENDING, they approve it but the Asset Manager does the actual allocation
        if (actor.role === Role.DEPARTMENT_HEAD && request.status === TransferStatus.PENDING) {
            return prisma.$transaction(async (tx) => {
                const approved = await tx.transferRequest.update({ where: { id }, data: { status: TransferStatus.APPROVED, approvedById: actor.userId } });
                await tx.activityLog.create({ data: this.logData(actor, "TRANSFER_APPROVED_BY_DH", id, {}) });
                await tx.notification.create({ data: { userId: request.requestedById, title: "Transfer approved by DH", message: `${request.asset.assetTag} transfer request was approved by Department Head, pending Asset Manager allocation`, type: "INFO", metadata: { transferRequestId: id } } });
                return approved;
            });
        }

        // If actor is Admin or Asset Manager, approve and perform direct allocation
        return prisma.$transaction(async (tx) => {
            await tx.allocationRecord.updateMany({ where: { assetId: request.assetId, allocationStatus: AllocationStatus.ACTIVE }, data: { allocationStatus: AllocationStatus.RETURNED, returnedAt: new Date(), returnNotes: "Transferred" } });
            const allocation = await tx.allocationRecord.create({ data: { assetId: request.assetId, employeeId: request.targetEmployeeId, departmentId: request.targetDepartmentId, allocatedById: actor.userId } });
            await tx.asset.update({ where: { id: request.assetId }, data: { status: AssetStatus.ALLOCATED } });
            const approved = await tx.transferRequest.update({ where: { id }, data: { status: TransferStatus.APPROVED, approvedById: actor.userId } });
            await tx.activityLog.create({ data: this.logData(actor, "TRANSFER_ALLOCATED", id, { allocationId: allocation.id }) });
            await tx.notification.create({ data: { userId: request.requestedById, title: "Asset allocated", message: `${request.asset.assetTag} has been allocated to you by the Asset Manager`, type: "TASK_ASSIGNED", metadata: { transferRequestId: id } } });
            return approved;
        });
    }

    private logData(actor: any, action: string, entityId: string, metadata: object) {
        return { userId: actor.userId, action, entityType: "TransferRequest", entityId, ipAddress: actor.ipAddress, userAgent: actor.userAgent, metadata };
    }
}

export const transferService = new TransferService();
