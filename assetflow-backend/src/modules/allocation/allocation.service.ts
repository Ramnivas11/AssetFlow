import { AllocationStatus, AssetStatus, Prisma, Role } from "@prisma/client";

import { HTTP_STATUS } from "../../constants/httpStatus";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { buildPaginationMeta, normalizePagination } from "../../utils/pagination";
import { assertAssetCanBeAllocated, assertAssetTransition } from "../assets/asset-lifecycle.service";

export class AllocationService {
    async list(input: Record<string, any>, actor: any) {
        const pagination = normalizePagination(input);
        const where: Prisma.AllocationRecordWhereInput = {
            assetId: input.assetId,
            employeeId: actor.role === Role.EMPLOYEE ? actor.userId : input.employeeId,
            departmentId: input.departmentId,
            allocationStatus: input.activeOnly ? AllocationStatus.ACTIVE : undefined,
        };
        const [items, total] = await prisma.$transaction([
            prisma.allocationRecord.findMany({
                where,
                skip: pagination.skip,
                take: pagination.take,
                orderBy: { allocatedAt: "desc" },
                include: { asset: true, employee: { select: { id: true, name: true, email: true } }, department: { select: { id: true, name: true } } },
            }),
            prisma.allocationRecord.count({ where }),
        ]);
        return { items, meta: buildPaginationMeta(pagination.page, pagination.limit, total) };
    }

    async allocate(input: any, actor: any) {
        const asset = await prisma.asset.findFirst({ where: { id: input.assetId, deletedAt: null } });
        if (!asset) throw new AppError("Asset not found", HTTP_STATUS.NOT_FOUND);
        assertAssetCanBeAllocated(asset.status);

        try {
            return await prisma.$transaction(async (tx) => {
                const allocation = await tx.allocationRecord.create({
                    data: {
                        assetId: input.assetId,
                        employeeId: input.employeeId ?? null,
                        departmentId: input.departmentId ?? null,
                        expectedReturnDate: input.expectedReturnDate,
                        allocatedById: actor.userId,
                    },
                    include: { employee: { select: { id: true, name: true, email: true } }, department: { select: { id: true, name: true } } },
                });
                await tx.asset.update({ where: { id: input.assetId }, data: { status: AssetStatus.ALLOCATED } });
                await tx.activityLog.create({ data: this.logData(actor, "ASSET_ALLOCATED", allocation.id, input) });
                if (input.employeeId) {
                    await tx.notification.create({ data: { userId: input.employeeId, title: "Asset assigned", message: `${asset.assetTag} has been assigned to you`, type: "TASK_ASSIGNED", metadata: { assetId: asset.id, allocationId: allocation.id } } });
                }
                return allocation;
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2002" || String(error.message).includes("one_active_allocation"))) {
                const active = await prisma.allocationRecord.findFirst({
                    where: { assetId: input.assetId, allocationStatus: AllocationStatus.ACTIVE },
                    include: {
                        employee: { select: { id: true, name: true, email: true, department: { select: { id: true, name: true, code: true } } } },
                        department: { select: { id: true, name: true, code: true } },
                    },
                });
                const heldBy = active?.employee
                    ? { type: "EMPLOYEE", id: active.employee.id, name: active.employee.name, email: active.employee.email, department: active.employee.department }
                    : active?.department
                      ? { type: "DEPARTMENT", id: active.department.id, name: active.department.name, department: active.department }
                      : null;
                throw new AppError(`Asset is already allocated${heldBy ? ` to ${heldBy.name}` : ""}`, HTTP_STATUS.CONFLICT, { conflict: true, heldBy });
            }
            throw error;
        }
    }

    async returnAllocation(id: string, input: any, actor: any) {
        const allocation = await prisma.allocationRecord.findUnique({ where: { id }, include: { asset: true } });
        if (!allocation || allocation.allocationStatus !== AllocationStatus.ACTIVE) throw new AppError("Active allocation not found", HTTP_STATUS.NOT_FOUND);
        assertAssetTransition(allocation.asset.status, AssetStatus.AVAILABLE);
        return prisma.$transaction(async (tx) => {
            const returned = await tx.allocationRecord.update({ where: { id }, data: { allocationStatus: AllocationStatus.RETURNED, returnedAt: new Date(), conditionOnReturn: input.conditionOnReturn, returnNotes: input.returnNotes } });
            await tx.asset.update({ where: { id: allocation.assetId }, data: { status: AssetStatus.AVAILABLE, currentCondition: input.conditionOnReturn } });
            await tx.activityLog.create({ data: this.logData(actor, "ASSET_RETURNED", id, input) });
            return returned;
        });
    }

    private logData(actor: any, action: string, entityId: string, metadata: object) {
        return { userId: actor.userId, action, entityType: "AllocationRecord", entityId, ipAddress: actor.ipAddress, userAgent: actor.userAgent, metadata };
    }
}

export const allocationService = new AllocationService();
