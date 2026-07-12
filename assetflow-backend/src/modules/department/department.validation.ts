import { DepartmentStatus } from "@prisma/client";
import { z } from "zod";

const cuid = z.string().cuid();

export const departmentListSchema = z.object({
    query: z.object({
        page: z.coerce.number().int().positive().optional(),
        limit: z.coerce.number().int().positive().max(100).optional(),
        search: z.string().trim().min(1).max(100).optional(),
        status: z.enum(DepartmentStatus).optional(),
        parentDepartmentId: cuid.optional(),
    }),
});

export const departmentIdSchema = z.object({
    params: z.object({
        id: cuid,
    }),
});

export const createDepartmentSchema = z.object({
    body: z.object({
        name: z.string().trim().min(2).max(120),
        code: z.string().trim().toUpperCase().min(2).max(24).regex(/^[A-Z0-9_-]+$/),
        parentDepartmentId: cuid.nullish(),
        headId: cuid.nullish(),
    }),
});

export const updateDepartmentSchema = z.object({
    params: z.object({
        id: cuid,
    }),
    body: z
        .object({
            name: z.string().trim().min(2).max(120).optional(),
            code: z.string().trim().toUpperCase().min(2).max(24).regex(/^[A-Z0-9_-]+$/).optional(),
            parentDepartmentId: cuid.nullish(),
            headId: cuid.nullish(),
            status: z.enum(DepartmentStatus).optional(),
        })
        .refine((value) => Object.keys(value).length > 0, "At least one field is required"),
});

export type DepartmentListInput = z.infer<typeof departmentListSchema>["query"];
export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>["body"];
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>["body"];
