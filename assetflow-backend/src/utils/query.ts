import { Prisma } from "@prisma/client";

export type SortOrder = "asc" | "desc";

export interface SortInput<T extends string = string> {
    sortBy?: T;
    sortOrder?: SortOrder;
}

export const activeOnly = { deletedAt: null } as const;

export const buildSearch = <T extends string>(search: string | undefined, fields: T[]) => {
    if (!search) return undefined;
    return fields.map((field) => ({
        [field]: { contains: search, mode: "insensitive" },
    })) as Prisma.Enumerable<Prisma.StringFilter>;
};

export const buildOrderBy = <T extends string>(
    input: SortInput<T>,
    allowed: readonly T[],
    fallback: Record<string, SortOrder>
) => {
    if (!input.sortBy || !allowed.includes(input.sortBy)) return fallback;
    return { [input.sortBy]: input.sortOrder ?? "asc" };
};

export const isUniqueConstraintError = (error: unknown, target?: string) => {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") return false;
    if (!target) return true;
    return String(error.meta?.target ?? "").includes(target);
};

export const isConstraintError = (error: unknown, constraintName: string) => {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
    return error.code === "P2002" || String(error.meta?.constraint ?? error.message).includes(constraintName);
};
