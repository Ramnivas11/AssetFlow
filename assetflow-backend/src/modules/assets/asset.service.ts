import { AssetStatus, Prisma, Role } from "@prisma/client";

import { HTTP_STATUS } from "../../constants/httpStatus";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { buildPaginationMeta, normalizePagination } from "../../utils/pagination";
import { assertAssetCanBeMutated, assertAssetTransition } from "./asset-lifecycle.service";

const include = {
    category: { select: { id: true, name: true } },
    department: { select: { id: true, name: true, code: true } },
} satisfies Prisma.AssetInclude;

export class AssetService {
    async list(input: Record<string, any>, actor: any) {
        const pagination = normalizePagination(input);
        const departmentId = await this.scopedDepartmentId(actor);
        const where: Prisma.AssetWhereInput = {
            deletedAt: null,
            status: input.status,
            categoryId: input.categoryId,
            departmentId: departmentId ?? input.departmentId,
            location: input.location ? { contains: input.location, mode: "insensitive" } : undefined,
            OR: input.search
                ? [
                      { name: { contains: input.search, mode: "insensitive" } },
                      { assetTag: { contains: input.search, mode: "insensitive" } },
                      { serialNumber: { contains: input.search, mode: "insensitive" } },
                  ]
                : undefined,
        };
        const orderBy: Prisma.AssetOrderByWithRelationInput = input.sortBy ? { [input.sortBy]: input.sortOrder ?? "asc" } : { createdAt: "desc" };
        const [items, total] = await prisma.$transaction([
            prisma.asset.findMany({ where, skip: pagination.skip, take: pagination.take, orderBy, include }),
            prisma.asset.count({ where }),
        ]);
        return { items, meta: buildPaginationMeta(pagination.page, pagination.limit, total) };
    }

    async get(id: string, actor: any) {
        const departmentId = await this.scopedDepartmentId(actor);
        const item = await prisma.asset.findFirst({
            where: { id, deletedAt: null, departmentId: departmentId ?? undefined },
            include: {
                ...include,
                allocations: { orderBy: { allocatedAt: "desc" }, take: 20, include: { employee: { select: { id: true, name: true, email: true } }, department: { select: { id: true, name: true } } } },
                maintenance: { orderBy: { createdAt: "desc" }, take: 20 },
                bookings: { orderBy: { startTime: "desc" }, take: 20 },
            },
        });
        if (!item) throw new AppError("Asset not found", HTTP_STATUS.NOT_FOUND);
        return item;
    }

    async create(input: any, actor: any) {
        try {
            return await prisma.$transaction(async (tx) => {
                const latest = await tx.asset.findFirst({ orderBy: { createdAt: "desc" }, select: { assetTag: true } });
                const next = latest?.assetTag?.match(/^AF-(\d+)$/) ? Number(latest.assetTag.slice(3)) + 1 : 1;
                const assetTag = `AF-${String(next).padStart(4, "0")}`;
                const asset = await tx.asset.create({
                    data: {
                        assetTag,
                        qrCodeValue: assetTag,
                        name: input.name,
                        description: input.description,
                        categoryId: input.categoryId,
                        departmentId: input.departmentId ?? null,
                        serialNumber: input.serialNumber,
                        location: input.location,
                        purchaseDate: input.purchaseDate,
                        purchaseCost: new Prisma.Decimal(input.purchaseCost),
                        warrantyExpiry: input.warrantyExpiry ?? null,
                        currentCondition: input.currentCondition,
                        isBookable: input.isBookable,
                        imageUrl: input.imageUrl,
                    },
                    include,
                });
                if (input.documents?.length) {
                    await tx.document.createMany({ data: input.documents.map((doc: any) => ({ ...doc, entityType: "Asset", entityId: asset.id, uploadedById: actor.userId })) });
                }
                await tx.activityLog.create({ data: this.logData(actor, "ASSET_CREATED", asset.id, { assetTag }) });
                return asset;
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new AppError("Asset tag or serial number already exists", HTTP_STATUS.CONFLICT);
            throw error;
        }
    }

    async update(id: string, input: any, actor: any) {
        const existing = await this.get(id, actor);
        assertAssetCanBeMutated(existing.status);
        if (input.status) assertAssetTransition(existing.status, input.status);
        const item = await prisma.asset.update({
            where: { id },
            data: {
                ...input,
                purchaseCost: input.purchaseCost === undefined ? undefined : new Prisma.Decimal(input.purchaseCost),
            },
            include,
        });
        await prisma.activityLog.create({ data: this.logData(actor, "ASSET_UPDATED", item.id, input) });
        return item;
    }

    async deactivate(id: string, actor: any) {
        const existing = await this.get(id, actor);
        assertAssetCanBeMutated(existing.status);
        const item = await prisma.asset.update({ where: { id }, data: { deletedAt: new Date() }, include });
        await prisma.activityLog.create({ data: this.logData(actor, "ASSET_DEACTIVATED", item.id, { assetTag: item.assetTag }) });
        return item;
    }

    async bulkStatus(input: any, actor: any) {
        const assets = await prisma.asset.findMany({ where: { id: { in: input.assetIds }, deletedAt: null }, select: { id: true, status: true } });
        for (const asset of assets) assertAssetTransition(asset.status, input.status);
        const result = await prisma.asset.updateMany({ where: { id: { in: assets.map((asset) => asset.id) } }, data: { status: input.status } });
        await prisma.activityLog.create({ data: this.logData(actor, "ASSET_BULK_STATUS_UPDATED", null, input) });
        return result;
    }

    private async scopedDepartmentId(actor: any) {
        if (actor.role !== Role.DEPARTMENT_HEAD) return undefined;
        const user = await prisma.user.findUnique({ where: { id: actor.userId }, select: { departmentId: true } });
        return user?.departmentId ?? "__none__";
    }

    private logData(actor: any, action: string, entityId: string | null, metadata: object) {
        return { userId: actor.userId, action, entityType: "Asset", entityId, ipAddress: actor.ipAddress, userAgent: actor.userAgent, metadata };
    }
}

export const assetService = new AssetService();
