import { z } from "zod";
import { Request, Response, NextFunction } from "express";

type Schema = z.ZodType<unknown>;

export const validate =
    (schema: Schema) =>
        (req: Request, res: Response, next: NextFunction) => {
            const result = schema.safeParse(req.body);

            if (!result.success) {
                return res.status(400).json({
                    success: false,
                    message: "Validation failed",
                    errors: result.error.flatten().fieldErrors,
                });
            }

            req.body = result.data;

            next();
        };
