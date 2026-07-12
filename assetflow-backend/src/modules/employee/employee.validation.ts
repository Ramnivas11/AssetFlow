import { Role, UserStatus } from "@prisma/client";
import { z } from "zod";

const cuid = z.string().cuid();

export const employeeListSchema = z.object({
    query: z.object({
        page: z.coerce.number().int().positive().optional(),
        limit: z.coerce.number().int().positive().max(1000).optional(),
        search: z.string().trim().min(1).max(100).optional(),
        departmentId: cuid.optional(),
        role: z.nativeEnum(Role).optional(),
        status: z.nativeEnum(UserStatus).optional(),
    }),
});

export const employeeIdSchema = z.object({
    params: z.object({}).passthrough().optional(),
});

export const updateEmployeeRoleSchema = z.object({
    params: z.object({}).passthrough().optional(),
    body: z.object({
        role: z.enum([Role.DEPARTMENT_HEAD, Role.ASSET_MANAGER]),
    }),
});

export const updateEmployeeStatusSchema = z.object({
    params: z.object({}).passthrough().optional(),
    body: z.object({
        status: z.nativeEnum(UserStatus),
    }),
});

export type EmployeeListInput = z.infer<typeof employeeListSchema>["query"];
export type UpdateEmployeeRoleInput = z.infer<typeof updateEmployeeRoleSchema>["body"];
export type UpdateEmployeeStatusInput = z.infer<typeof updateEmployeeStatusSchema>["body"];
