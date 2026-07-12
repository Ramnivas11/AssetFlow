import { Role } from "@prisma/client";

export interface EmployeeActorContext {
    userId: string;
    role: Role;
    ipAddress?: string;
    userAgent?: string;
}
