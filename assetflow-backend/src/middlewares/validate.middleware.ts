import { z } from "zod";
import { Request, Response, NextFunction } from "express";

type Schema = z.ZodType<unknown>;

const sanitizeEmptyStrings = (obj: any): any => {
    if (obj === "") return undefined;
    if (obj && typeof obj === "object" && !Array.isArray(obj)) {
        return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, sanitizeEmptyStrings(v)]));
    }
    if (Array.isArray(obj)) return obj.map(sanitizeEmptyStrings);
    return obj;
};

export const validate =
    (schema: Schema) =>
        (req: Request, res: Response, next: NextFunction) => {
            const body = sanitizeEmptyStrings(req.body);
            const query = sanitizeEmptyStrings(req.query);
            const result = schema.safeParse({ body, params: req.params, query });

            if (!result.success) {
                return res.status(400).json({
                    success: false,
                    message: "Validation failed",
                    errors: result.error.flatten().fieldErrors,
                });
            }

            const parsed = result.data as { body?: unknown; params?: unknown; query?: unknown };
            if (parsed.body !== undefined) req.body = parsed.body;
            if (parsed.params !== undefined) Object.assign(req.params, parsed.params);
            if (parsed.query !== undefined) Object.assign(req.query, parsed.query);

            next();
        };
