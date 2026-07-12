import { env } from "./env";

const parseDuration = (value: string) => {
    const match = value.match(/^(\d+)([smhd])$/i);
    if (!match) return 0;

    const amount = Number(match[1]);
    const unit = match[2].toLowerCase();

    const multipliers: Record<string, number> = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
    return amount * (multipliers[unit] ?? 0);
};

export const cookieConfig = {
    httpOnly: true,

    secure: env.NODE_ENV === "production",

    sameSite: "lax" as const,

    path: "/",

    maxAge: parseDuration(env.JWT_REFRESH_EXPIRES_IN),
};