import { Department, Role, User, UserStatus } from "@prisma/client";

import { EmployeeDTO } from "./employee.dto";

type EmployeeWithDepartment = User & {
    department?: Pick<Department, "id" | "name" | "code"> | null;
};

export const toEmployeeDTO = (employee: EmployeeWithDepartment): EmployeeDTO => ({
    id: employee.id,
    name: employee.name,
    email: employee.email,
    role: employee.role as Role,
    status: employee.status as UserStatus,
    departmentId: employee.departmentId,
    department: employee.department
        ? {
              id: employee.department.id,
              name: employee.department.name,
              code: employee.department.code,
          }
        : null,
    createdAt: employee.createdAt.toISOString(),
    updatedAt: employee.updatedAt.toISOString(),
});
