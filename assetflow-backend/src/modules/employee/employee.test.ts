import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";
import { Role } from "@prisma/client";

import app from "../../app";
import { generateAccessToken } from "../../lib/jwt";
import { employeeService } from "./employee.container";

const originalUpdateRole = employeeService.updateRole.bind(employeeService);

const createEmployeePayload = (role: Role) => ({
    userId: role === Role.ADMIN ? "admin-1" : "employee-1",
    role,
});

test.before(() => {
    employeeService.updateRole = async (id: string, input: { role: Role }, actor: { userId: string; role: Role }) => {
        if (actor.role !== Role.ADMIN) {
            throw Object.assign(new Error("You do not have permission to perform this action"), { statusCode: 403 });
        }
        if (actor.userId === id) {
            throw Object.assign(new Error("You cannot promote yourself"), { statusCode: 403 });
        }
        return {
            id,
            role: input.role,
            name: "Employee",
            email: "employee@example.com",
            status: "ACTIVE",
            departmentId: null,
            department: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
    };
});

test.after(() => {
    employeeService.updateRole = originalUpdateRole;
});

test("non-admin cannot promote an employee", async () => {
    const response = await request(app)
        .patch("/api/v1/employees/user-1/role")
        .set("Authorization", `Bearer ${generateAccessToken(createEmployeePayload(Role.EMPLOYEE).userId, createEmployeePayload(Role.EMPLOYEE).role)}`)
        .send({ role: Role.DEPARTMENT_HEAD });

    assert.equal(response.status, 403);
});

test("admin can promote an employee", async () => {
    const response = await request(app)
        .patch("/api/v1/employees/user-1/role")
        .set("Authorization", `Bearer ${generateAccessToken(createEmployeePayload(Role.ADMIN).userId, createEmployeePayload(Role.ADMIN).role)}`)
        .send({ role: Role.DEPARTMENT_HEAD });

    assert.equal(response.status, 200);
    assert.equal(response.body.data.role, Role.DEPARTMENT_HEAD);
});
