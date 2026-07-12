import { AssetCondition, MaintenanceStatus, Priority } from "@prisma/client";
import { z } from "zod";

const cuid = z.string().cuid();

export const maintenanceListSchema = z.object({
    query: z.object({
        page: z.coerce.number().int().positive().optional(),
        limit: z.coerce.number().int().positive().max(100).optional(),
        assetId: cuid.optional(),
        status: z.enum(MaintenanceStatus).optional(),
        priority: z.enum(Priority).optional(),
    }),
});

export const createMaintenanceSchema = z.object({
    body: z.object({
        assetId: cuid,
        issue: z.string().trim().min(3).max(2000),
        priority: z.enum(Priority).default(Priority.MEDIUM),
        conditionBefore: z.enum(AssetCondition),
        estimatedCost: z.coerce.number().nonnegative().optional(),
        attachments: z.array(z.object({ url: z.string().url(), filename: z.string().min(1), mimeType: z.string().min(1), size: z.number().int().nonnegative() })).optional(),
    }),
});

export const maintenanceDecisionSchema = z.object({
    params: z.object({ id: cuid }),
    body: z.object({ decision: z.enum(["APPROVE", "REJECT"]), technicianId: cuid.optional() }),
});

export const maintenanceStatusSchema = z.object({
    params: z.object({ id: cuid }),
    body: z.object({
        status: z.enum([MaintenanceStatus.IN_PROGRESS, MaintenanceStatus.RESOLVED, MaintenanceStatus.CANCELLED]),
        resolution: z.string().trim().max(2000).optional(),
        conditionAfter: z.enum(AssetCondition).optional(),
        actualCost: z.coerce.number().nonnegative().optional(),
    }),
});
