import { AssetCondition, AssetStatus } from "@prisma/client";
import { z } from "zod";

const cuid = z.string().cuid();

export const assetListSchema = z.object({
    query: z.object({
        page: z.coerce.number().int().positive().optional(),
        limit: z.coerce.number().int().positive().max(1000).optional(),
        search: z.string().trim().min(1).optional(),
        status: z.enum(AssetStatus).optional(),
        categoryId: cuid.optional(),
        departmentId: cuid.optional(),
        location: z.string().trim().min(1).optional(),
        sortBy: z.enum(["assetTag", "name", "status", "purchaseDate", "purchaseCost", "createdAt"]).optional(),
        sortOrder: z.enum(["asc", "desc"]).optional(),
    }),
});

export const assetIdSchema = z.object({ params: z.object({ id: cuid }) });

export const createAssetSchema = z.object({
    body: z.object({
        name: z.string().trim().min(2).max(160),
        description: z.string().trim().max(1000).optional(),
        categoryId: cuid,
        departmentId: cuid.nullish(),
        serialNumber: z.string().trim().min(2).max(120),
        location: z.string().trim().min(2).max(160),
        purchaseDate: z.coerce.date(),
        purchaseCost: z.coerce.number().nonnegative(),
        warrantyExpiry: z.coerce.date().nullish(),
        currentCondition: z.enum(AssetCondition).default(AssetCondition.GOOD),
        isBookable: z.coerce.boolean().default(true),
        imageUrl: z.string().url().optional(),
        documents: z.array(z.object({ url: z.string().url(), filename: z.string().min(1), mimeType: z.string().min(1), size: z.number().int().nonnegative() })).optional(),
    }),
});

export const updateAssetSchema = z.object({
    params: z.object({ id: cuid }),
    body: createAssetSchema.shape.body.partial().extend({ status: z.enum(AssetStatus).optional() }).refine((value) => Object.keys(value).length > 0, "At least one field is required"),
});

export const bulkAssetStatusSchema = z.object({
    body: z.object({
        assetIds: z.array(cuid).min(1).max(100),
        status: z.enum(AssetStatus),
    }),
});
