import { AuditResult } from "@prisma/client";
import { z } from "zod";

const cuid = z.string().cuid();

export const auditListSchema = z.object({
    query: z.object({
        page: z.coerce.number().int().positive().optional(),
        limit: z.coerce.number().int().positive().max(100).optional(),
        status: z.enum(["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
    }),
});

export const createAuditSchema = z.object({
    body: z.object({
        title: z.string().trim().min(2).max(160),
        scope: z.string().trim().max(500).optional(),
        departmentId: cuid.optional(),
        startDate: z.coerce.date(),
        endDate: z.coerce.date(),
        auditorIds: z.array(cuid).min(1),
    }).refine((value) => value.endDate >= value.startDate, "Audit end date cannot be before start date"),
});

export const auditIdSchema = z.object({ params: z.object({ id: cuid }) });
export const auditItemSchema = z.object({ params: z.object({ id: cuid, itemId: cuid }), body: z.object({ result: z.enum(AuditResult), remarks: z.string().trim().max(1000).optional() }) });
