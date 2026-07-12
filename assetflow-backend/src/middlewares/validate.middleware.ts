import { z } from "zod";
import { Request, Response, NextFunction } from "express";

type Schema = z.ZodType<unknown>;

export const validate =
    (schema: Schema) =>
        (req: Request, res: Response, next: NextFunction) => {
            const result = schema.safeParse({ body: req.body, params: req.params, query: req.query });

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
