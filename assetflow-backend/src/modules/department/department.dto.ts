import { DepartmentStatus } from "@prisma/client";

export interface DepartmentDTO {
    id: string;
    name: string;
    code: string;
    status: DepartmentStatus;
    parentDepartmentId: string | null;
    headId: string | null;
    head: {
        id: string;
        name: string;
        email: string;
    } | null;
    createdAt: string;
    updatedAt: string;
}
