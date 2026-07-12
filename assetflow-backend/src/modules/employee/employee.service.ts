import { Role } from "@prisma/client";

import { HTTP_STATUS } from "../../constants/httpStatus";
import { ActivityLogRepository } from "../activity-log/activity-log.repository";
import { AppError } from "../../utils/AppError";
import { buildPaginationMeta, normalizePagination } from "../../utils/pagination";
import { toEmployeeDTO } from "./employee.mapper";
import { EmployeeActorContext } from "./employee.types";
import { EmployeeRepository } from "./employee.repository";
import { UpdateEmployeeRoleInput, UpdateEmployeeStatusInput, EmployeeListInput } from "./employee.validation";

export class EmployeeService {
    constructor(
        private readonly employeeRepository: EmployeeRepository,
        private readonly activityLogRepository: ActivityLogRepository
    ) {}

    async list(input: EmployeeListInput, actor: EmployeeActorContext) {
        const pagination = normalizePagination(input);
        const scopeDepartmentId = actor.role === Role.DEPARTMENT_HEAD ? await this.employeeRepository.findDepartmentIdByUserId(actor.userId) : undefined;
        const result = await this.employeeRepository.list(input, pagination.skip, pagination.take, scopeDepartmentId);

        return {
            items: result.items.map(toEmployeeDTO),
            meta: buildPaginationMeta(pagination.page, pagination.limit, result.total),
        };
    }

    async getById(id: string) {
        const employee = await this.employeeRepository.findById(id);
        if (!employee) throw new AppError("Employee not found", HTTP_STATUS.NOT_FOUND);
        return toEmployeeDTO(employee);
    }

    async updateRole(id: string, input: UpdateEmployeeRoleInput, actor: EmployeeActorContext) {
        if (actor.userId === id) throw new AppError("You cannot promote yourself", HTTP_STATUS.FORBIDDEN);
        // Only department-head and asset-manager promotions are in scope; employee and admin roles are intentionally not promotable via this endpoint.
        if (![Role.DEPARTMENT_HEAD, Role.ASSET_MANAGER].includes(input.role)) {
            throw new AppError("Only department head and asset manager promotions are allowed", HTTP_STATUS.BAD_REQUEST);
        }
        if (actor.role !== Role.ADMIN) {
            throw new AppError("You do not have permission to perform this action", HTTP_STATUS.FORBIDDEN);
        }

        const employee = await this.employeeRepository.findById(id);
        if (!employee) throw new AppError("Employee not found", HTTP_STATUS.NOT_FOUND);
        if (employee.role === input.role) return toEmployeeDTO(employee);

        const updated = await this.employeeRepository.updateRole(id, input.role);
        await this.activityLogRepository.create({
            userId: actor.userId,
            action: "USER_ROLE_CHANGED",
            entityType: "User",
            entityId: updated.id,
            ipAddress: actor.ipAddress,
            userAgent: actor.userAgent,
            metadata: { fromRole: employee.role, toRole: updated.role },
        });

        return toEmployeeDTO(updated);
    }

    async updateStatus(id: string, input: UpdateEmployeeStatusInput, actor: EmployeeActorContext) {
        if (actor.role !== Role.ADMIN) {
            throw new AppError("You do not have permission to perform this action", HTTP_STATUS.FORBIDDEN);
        }

        const employee = await this.employeeRepository.findById(id);
        if (!employee) throw new AppError("Employee not found", HTTP_STATUS.NOT_FOUND);

        const updated = await this.employeeRepository.updateStatus(id, input.status);
        await this.activityLogRepository.create({
            userId: actor.userId,
            action: "USER_STATUS_CHANGED",
            entityType: "User",
            entityId: updated.id,
            ipAddress: actor.ipAddress,
            userAgent: actor.userAgent,
            metadata: { fromStatus: employee.status, toStatus: updated.status },
        });

        return toEmployeeDTO(updated);
    }
}
