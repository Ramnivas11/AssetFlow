import { CategoryStatus } from "@prisma/client";
import { z } from "zod";

const cuid = z.string().cuid();
const dynamicFields = z.array(z.object({ key: z.string().min(1).max(60), label: z.string().min(1).max(120), type: z.string().min(1).max(40) })).default([]);

export const categoryListSchema = z.object({
    query: z.object({
        page: z.coerce.number().int().positive().optional(),
        limit: z.coerce.number().int().positive().max(100).optional(),
        search: z.string().trim().min(1).optional(),
        status: z.enum(CategoryStatus).optional(),
    }),
});

export const categoryIdSchema = z.object({ params: z.object({ id: cuid }) });

export const createCategorySchema = z.object({
    body: z.object({
        name: z.string().trim().min(2).max(120),
        description: z.string().trim().max(500).optional(),
        dynamicFields,
    }),
});

export const updateCategorySchema = z.object({
    params: z.object({ id: cuid }),
    body: createCategorySchema.shape.body.partial().extend({ status: z.enum(CategoryStatus).optional() }).refine((value) => Object.keys(value).length > 0, "At least one field is required"),
});
