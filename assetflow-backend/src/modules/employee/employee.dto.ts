import { Role, UserStatus } from "@prisma/client";

export interface EmployeeDTO {
    id: string;
    name: string;
    email: string;
    role: Role;
    status: UserStatus;
    departmentId: string | null;
    department: {
        id: string;
        name: string;
        code: string;
    } | null;
    createdAt: string;
    updatedAt: string;
}
