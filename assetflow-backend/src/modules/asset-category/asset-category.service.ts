import { Prisma } from "@prisma/client";

import { HTTP_STATUS } from "../../constants/httpStatus";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { buildPaginationMeta, normalizePagination } from "../../utils/pagination";

export class AssetCategoryService {
    async list(input: Record<string, any>) {
        const pagination = normalizePagination(input);
        const where: Prisma.AssetCategoryWhereInput = {
            deletedAt: null,
            status: input.status,
            OR: input.search
                ? [{ name: { contains: input.search, mode: "insensitive" } }, { description: { contains: input.search, mode: "insensitive" } }]
                : undefined,
        };
        const [items, total] = await prisma.$transaction([
            prisma.assetCategory.findMany({ where, skip: pagination.skip, take: pagination.take, orderBy: { name: "asc" } }),
            prisma.assetCategory.count({ where }),
        ]);
        return { items, meta: buildPaginationMeta(pagination.page, pagination.limit, total) };
    }

    async get(id: string) {
        const item = await prisma.assetCategory.findFirst({ where: { id, deletedAt: null } });
        if (!item) throw new AppError("Asset category not found", HTTP_STATUS.NOT_FOUND);
        return item;
    }

    async create(input: any, actor: any) {
        try {
            const item = await prisma.assetCategory.create({ data: input });
            await this.log(actor, "ASSET_CATEGORY_CREATED", item.id, { name: item.name });
            return item;
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new AppError("Asset category already exists", HTTP_STATUS.CONFLICT);
            throw error;
        }
    }

    async update(id: string, input: any, actor: any) {
        await this.get(id);
        const item = await prisma.assetCategory.update({ where: { id }, data: input });
        await this.log(actor, "ASSET_CATEGORY_UPDATED", item.id, input);
        return item;
    }

    async deactivate(id: string, actor: any) {
        await this.get(id);
        const item = await prisma.assetCategory.update({ where: { id }, data: { status: "INACTIVE", deletedAt: new Date() } });
        await this.log(actor, "ASSET_CATEGORY_DEACTIVATED", item.id, { name: item.name });
        return item;
    }

    private log(actor: any, action: string, entityId: string, metadata: object) {
        return prisma.activityLog.create({ data: { userId: actor.userId, action, entityType: "AssetCategory", entityId, ipAddress: actor.ipAddress, userAgent: actor.userAgent, metadata } });
    }
}

export const assetCategoryService = new AssetCategoryService();
