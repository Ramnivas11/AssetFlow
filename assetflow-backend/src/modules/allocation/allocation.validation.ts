import { AssetCondition } from "@prisma/client";
import { z } from "zod";

const cuid = z.string().cuid();

export const allocationListSchema = z.object({
    query: z.object({
        page: z.coerce.number().int().positive().optional(),
        limit: z.coerce.number().int().positive().max(100).optional(),
        assetId: cuid.optional(),
        employeeId: cuid.optional(),
        departmentId: cuid.optional(),
        activeOnly: z.coerce.boolean().optional(),
    }),
});

export const allocateAssetSchema = z.object({
    body: z
        .object({
            assetId: cuid,
            employeeId: cuid.nullish(),
            departmentId: cuid.nullish(),
            expectedReturnDate: z.coerce.date().nullish(),
        })
        .refine((value) => Boolean(value.employeeId) !== Boolean(value.departmentId), "Allocate to either employee or department"),
});

export const returnAssetSchema = z.object({
    params: z.object({ id: cuid }),
    body: z.object({
        conditionOnReturn: z.enum(AssetCondition),
        returnNotes: z.string().trim().max(1000).optional(),
    }),
});
