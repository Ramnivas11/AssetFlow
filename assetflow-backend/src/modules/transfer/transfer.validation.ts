import { z } from "zod";

const cuid = z.string().cuid();

export const transferListSchema = z.object({
    query: z.object({
        page: z.coerce.number().int().positive().optional(),
        limit: z.coerce.number().int().positive().max(100).optional(),
        status: z.enum(["PENDING", "APPROVED", "REJECTED", "CANCELLED"]).optional(),
    }),
});

export const createTransferSchema = z.object({
    body: z.object({
        assetId: cuid,
        targetEmployeeId: cuid.optional(),
        targetDepartmentId: cuid.optional(),
        reason: z.string().trim().min(3).max(1000),
    }).refine((value) => Boolean(value.targetEmployeeId) !== Boolean(value.targetDepartmentId), "Transfer target must be employee or department"),
});

export const decideTransferSchema = z.object({
    params: z.object({ id: cuid }),
    body: z.object({ decision: z.enum(["APPROVE", "REJECT"]) }),
});
