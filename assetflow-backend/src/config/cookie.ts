import { env } from "./env";

export const cookieConfig = {
    httpOnly: true,

    secure: env.NODE_ENV === "production",

    sameSite: "lax" as const,

    path: "/",

    maxAge: 7 * 24 * 60 * 60 * 1000,
};