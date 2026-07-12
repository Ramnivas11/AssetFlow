import { Department, User } from "@prisma/client";

import { DepartmentDTO } from "./department.dto";

type DepartmentWithHead = Department & {
    head?: Pick<User, "id" | "name" | "email"> | null;
};

export const toDepartmentDTO = (department: DepartmentWithHead): DepartmentDTO => ({
    id: department.id,
    name: department.name,
    code: department.code,
    status: department.status,
    parentDepartmentId: department.parentDepartmentId,
    headId: department.headId,
    head: department.head
        ? {
              id: department.head.id,
              name: department.head.name,
              email: department.head.email,
          }
        : null,
    createdAt: department.createdAt.toISOString(),
    updatedAt: department.updatedAt.toISOString(),
});
