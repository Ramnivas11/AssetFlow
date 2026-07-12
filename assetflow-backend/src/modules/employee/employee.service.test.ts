import assert from "node:assert/strict";
import test from "node:test";
import { Role, UserStatus } from "@prisma/client";

import { AppError } from "../../utils/AppError";
import { EmployeeService } from "./employee.service";

const makeActivityLogRepository = () => ({
    entries: [] as unknown[],
    async create(entry: unknown) {
        this.entries.push(entry);
        return entry;
    },
});

test("role change rejects promotion to admin or employee", async () => {
    const employeeRepository = {
        findById: async () => ({ id: "user-1", role: Role.EMPLOYEE, departmentId: null, status: UserStatus.ACTIVE, deletedAt: null }),
    };
    const service = new EmployeeService(employeeRepository as never, makeActivityLogRepository() as never);
    const actor = { userId: "admin-1", role: Role.ADMIN };

    await assert.rejects(
        () => service.updateRole("user-1", { role: Role.ADMIN } as never, actor),
        (error: unknown) => error instanceof AppError && error.message === "Only department head and asset manager promotions are allowed"
    );

    await assert.rejects(
        () => service.updateRole("user-1", { role: Role.EMPLOYEE } as never, actor),
        (error: unknown) => error instanceof AppError && error.message === "Only department head and asset manager promotions are allowed"
    );
});

test("service prevents self-promotion", async () => {
    const employeeRepository = {
        findById: async () => ({ id: "user-1", role: Role.EMPLOYEE, departmentId: null, status: UserStatus.ACTIVE, deletedAt: null }),
    };
    const service = new EmployeeService(employeeRepository as never, makeActivityLogRepository() as never);

    await assert.rejects(
        () => service.updateRole("user-1", { role: Role.DEPARTMENT_HEAD }, { userId: "user-1", role: Role.ADMIN }),
        (error: unknown) => error instanceof AppError && error.message === "You cannot promote yourself"
    );
});
