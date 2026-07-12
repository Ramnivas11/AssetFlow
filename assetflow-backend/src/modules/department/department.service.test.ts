import assert from "node:assert/strict";
import test from "node:test";
import { DepartmentStatus, Role, UserStatus } from "@prisma/client";

import { AppError } from "../../utils/AppError";
import { DepartmentService } from "./department.service";

const now = new Date();

const makeDepartment = (overrides: Record<string, unknown> = {}) => ({
    id: "dept-1",
    name: "Engineering",
    code: "ENG",
    status: DepartmentStatus.ACTIVE,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    parentDepartmentId: null,
    headId: null,
    head: null,
    ...overrides,
});

const makeActivityLogRepository = () => ({
    entries: [] as unknown[],
    async create(entry: unknown) {
        this.entries.push(entry);
        return entry;
    },
});

test("create rejects a department head without an eligible role", async () => {
    const departmentRepository = {
        findByNameOrCode: async () => null,
        findActiveById: async () => null,
        findEligibleHead: async () => null,
    };
    const service = new DepartmentService(departmentRepository as never, makeActivityLogRepository() as never);

    await assert.rejects(
        () => service.create({ name: "Engineering", code: "ENG", headId: "user-1", parentDepartmentId: null }, { userId: "admin-1" }),
        (error: unknown) => error instanceof AppError && error.message === "Department head must be an active admin or department head"
    );
});

test("update rejects hierarchy cycles", async () => {
    const departmentRepository = {
        findById: async () => makeDepartment({ id: "dept-root" }),
        findActiveById: async () => makeDepartment({ id: "dept-child" }),
        getParentChainIds: async () => ["dept-child", "dept-root"],
    };
    const service = new DepartmentService(departmentRepository as never, makeActivityLogRepository() as never);

    await assert.rejects(
        () => service.update("dept-root", { parentDepartmentId: "dept-child" }, { userId: "admin-1" }),
        (error: unknown) => error instanceof AppError && error.message === "Department hierarchy cannot contain a cycle"
    );
});

test("create writes an immutable activity log entry", async () => {
    const activityLogRepository = makeActivityLogRepository();
    const departmentRepository = {
        findByNameOrCode: async () => null,
        findActiveById: async () => null,
        findEligibleHead: async () => ({ id: "head-1", departmentId: "dept-1", role: Role.DEPARTMENT_HEAD, status: UserStatus.ACTIVE }),
        create: async () => makeDepartment({ headId: "head-1", head: { id: "head-1", name: "Ada", email: "ada@example.com" } }),
    };
    const service = new DepartmentService(departmentRepository as never, activityLogRepository as never);

    const department = await service.create({ name: "Engineering", code: "ENG", headId: "head-1", parentDepartmentId: null }, { userId: "admin-1" });

    assert.equal(department.head?.id, "head-1");
    assert.equal(activityLogRepository.entries.length, 1);
    assert.match(JSON.stringify(activityLogRepository.entries[0]), /DEPARTMENT_CREATED/);
});
