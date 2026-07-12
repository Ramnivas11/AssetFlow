import { Prisma, PrismaClient, Role, UserStatus } from "@prisma/client";

import { prisma } from "../../lib/prisma";
import { EmployeeListInput } from "./employee.validation";

const employeeInclude = {
    department: {
        select: {
            id: true,
            name: true,
            code: true,
        },
    },
} satisfies Prisma.UserInclude;

export class EmployeeRepository {
    constructor(private readonly db: PrismaClient | Prisma.TransactionClient = prisma) {}

    async list(input: EmployeeListInput, skip: number, take: number, scopeDepartmentId?: string | null) {
        const where: Prisma.UserWhereInput = {
            deletedAt: null,
            departmentId: scopeDepartmentId !== undefined ? scopeDepartmentId : input.departmentId,
            role: input.role,
            status: input.status,
            OR: input.search
                ? [
                      { name: { contains: input.search, mode: "insensitive" } },
                      { email: { contains: input.search, mode: "insensitive" } },
                  ]
                : undefined,
        };

        const [items, total] = await this.db.$transaction([
            this.db.user.findMany({
                where,
                skip,
                take,
                orderBy: [{ role: "asc" }, { name: "asc" }],
                include: employeeInclude,
            }),
            this.db.user.count({ where }),
        ]);

        return { items, total };
    }

    async findById(id: string) {
        return this.db.user.findFirst({
            where: { id, deletedAt: null },
            include: employeeInclude,
        });
    }

    async findDepartmentIdByUserId(userId: string) {
        const user = await this.db.user.findFirst({
            where: { id: userId, deletedAt: null },
            select: { departmentId: true },
        });
        return user?.departmentId ?? null;
    }

    async updateRole(id: string, role: Role) {
        return this.db.user.update({
            where: { id },
            data: { role },
            include: employeeInclude,
        });
    }

    async updateStatus(id: string, status: UserStatus) {
        return this.db.user.update({
            where: { id },
            data: { status },
            include: employeeInclude,
        });
    }
}
