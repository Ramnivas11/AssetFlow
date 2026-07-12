
import { z } from "zod";

export const signupSchema = z.object({
    name: z
        .string()
        .trim()
        .min(3)
        .max(100),

    email: z
        .string()
        .trim()
        .email(),

    password: z
        .string()
        .min(8)
        .max(100)
        .regex(/[A-Z]/, "Must contain uppercase")
        .regex(/[a-z]/, "Must contain lowercase")
        .regex(/[0-9]/, "Must contain number")
        .regex(/[^A-Za-z0-9]/, "Must contain special character"),
});

export const loginSchema = z.object({
    email: z.string().trim().email().transform((email) => email.toLowerCase()),
    password: z.string().min(1).max(100),
});

export type SignupDTO = z.infer<typeof signupSchema>;
export type LoginDTO = z.infer<typeof loginSchema>;
