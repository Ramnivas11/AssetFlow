import { DepartmentStatus, Prisma, PrismaClient, Role, UserStatus } from "@prisma/client";

import { prisma } from "../../lib/prisma";
import { CreateDepartmentInput, DepartmentListInput, UpdateDepartmentInput } from "./department.validation";

const departmentInclude = {
    head: {
        select: {
            id: true,
            name: true,
            email: true,
        },
    },
} satisfies Prisma.DepartmentInclude;

export class DepartmentRepository {
    constructor(private readonly db: PrismaClient | Prisma.TransactionClient = prisma) {}

    async list(input: DepartmentListInput, skip: number, take: number) {
        const where: Prisma.DepartmentWhereInput = {
            deletedAt: null,
            status: input.status,
            parentDepartmentId: input.parentDepartmentId,
            OR: input.search
                ? [
                      { name: { contains: input.search, mode: "insensitive" } },
                      { code: { contains: input.search, mode: "insensitive" } },
                  ]
                : undefined,
        };

        const [items, total] = await this.db.$transaction([
            this.db.department.findMany({
                where,
                skip,
                take,
                orderBy: [{ status: "asc" }, { name: "asc" }],
                include: departmentInclude,
            }),
            this.db.department.count({ where }),
        ]);

        return { items, total };
    }

    findById(id: string) {
        return this.db.department.findFirst({
            where: { id, deletedAt: null },
            include: departmentInclude,
        });
    }

    findActiveById(id: string) {
        return this.db.department.findFirst({
            where: { id, deletedAt: null, status: DepartmentStatus.ACTIVE },
            include: departmentInclude,
        });
    }

    findByNameOrCode(name: string, code: string, excludeId?: string) {
        return this.db.department.findFirst({
            where: {
                deletedAt: null,
                id: excludeId ? { not: excludeId } : undefined,
                OR: [{ name }, { code }],
            },
        });
    }

    findEligibleHead(headId: string) {
        return this.db.user.findFirst({
            where: {
                id: headId,
                deletedAt: null,
                status: UserStatus.ACTIVE,
                role: { in: [Role.DEPARTMENT_HEAD, Role.ADMIN] },
            },
            select: {
                id: true,
                departmentId: true,
            },
        });
    }

    listAncestorIds(startDepartmentId: string) {
        return this.db.department.findMany({
            where: { id: startDepartmentId, deletedAt: null },
            select: {
                id: true,
                parentDepartmentId: true,
            },
        });
    }

    async getParentChainIds(startDepartmentId: string): Promise<string[]> {
        const ids: string[] = [];
        let nextId: string | null = startDepartmentId;

        while (nextId) {
            const department: { id: string; parentDepartmentId: string | null } | null = await this.db.department.findFirst({
                where: { id: nextId, deletedAt: null },
                select: { id: true, parentDepartmentId: true },
            });

            if (!department) break;
            ids.push(department.id);
            nextId = department.parentDepartmentId;
        }

        return ids;
    }

    create(data: CreateDepartmentInput) {
        return this.db.department.create({
            data: {
                name: data.name,
                code: data.code,
                parentDepartmentId: data.parentDepartmentId ?? null,
                headId: data.headId ?? null,
            },
            include: departmentInclude,
        });
    }

    update(id: string, data: UpdateDepartmentInput) {
        return this.db.department.update({
            where: { id },
            data: {
                name: data.name,
                code: data.code,
                parentDepartmentId: data.parentDepartmentId === undefined ? undefined : data.parentDepartmentId,
                headId: data.headId === undefined ? undefined : data.headId,
                status: data.status,
            },
            include: departmentInclude,
        });
    }

    deactivate(id: string) {
        return this.db.department.update({
            where: { id },
            data: {
                status: DepartmentStatus.INACTIVE,
                deletedAt: new Date(),
            },
            include: departmentInclude,
        });
    }
}
