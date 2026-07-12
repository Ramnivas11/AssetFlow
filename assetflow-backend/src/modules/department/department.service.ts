import { Prisma } from "@prisma/client";

import { HTTP_STATUS } from "../../constants/httpStatus";
import { ActivityLogRepository } from "../activity-log/activity-log.repository";
import { AppError } from "../../utils/AppError";
import { buildPaginationMeta, normalizePagination } from "../../utils/pagination";
import { toDepartmentDTO } from "./department.mapper";
import { ActorContext } from "./department.types";
import { DepartmentRepository } from "./department.repository";
import { CreateDepartmentInput, DepartmentListInput, UpdateDepartmentInput } from "./department.validation";

export class DepartmentService {
    constructor(
        private readonly departmentRepository: DepartmentRepository,
        private readonly activityLogRepository: ActivityLogRepository
    ) {}

    async list(input: DepartmentListInput) {
        const pagination = normalizePagination(input);
        const result = await this.departmentRepository.list(input, pagination.skip, pagination.take);

        return {
            items: result.items.map(toDepartmentDTO),
            meta: buildPaginationMeta(pagination.page, pagination.limit, result.total),
        };
    }

    async getById(id: string) {
        const department = await this.departmentRepository.findById(id);
        if (!department) throw new AppError("Department not found", HTTP_STATUS.NOT_FOUND);

        return toDepartmentDTO(department);
    }

    async create(input: CreateDepartmentInput, actor: ActorContext) {
        await this.assertUniqueNameAndCode(input.name, input.code);
        await this.assertParentIsActive(input.parentDepartmentId ?? null);
        await this.assertHeadIsEligible(input.headId ?? null);

        try {
            const department = await this.departmentRepository.create(input);
            await this.activityLogRepository.create({
                userId: actor.userId,
                action: "DEPARTMENT_CREATED",
                entityType: "Department",
                entityId: department.id,
                ipAddress: actor.ipAddress,
                userAgent: actor.userAgent,
                metadata: { name: department.name, code: department.code },
            });

            return toDepartmentDTO(department);
        } catch (error) {
            this.handleUniqueConstraint(error);
        }
    }

    async update(id: string, input: UpdateDepartmentInput, actor: ActorContext) {
        const existing = await this.departmentRepository.findById(id);
        if (!existing) throw new AppError("Department not found", HTTP_STATUS.NOT_FOUND);

        if (input.name || input.code) {
            await this.assertUniqueNameAndCode(input.name ?? existing.name, input.code ?? existing.code, id);
        }

        if (input.parentDepartmentId !== undefined) {
            if (input.parentDepartmentId === id) {
                throw new AppError("Department cannot be its own parent", HTTP_STATUS.BAD_REQUEST);
            }

            await this.assertParentIsActive(input.parentDepartmentId);
            if (input.parentDepartmentId) await this.assertNoHierarchyCycle(id, input.parentDepartmentId);
        }

        if (input.headId !== undefined) await this.assertHeadIsEligible(input.headId);

        try {
            const department = await this.departmentRepository.update(id, input);
            await this.activityLogRepository.create({
                userId: actor.userId,
                action: "DEPARTMENT_UPDATED",
                entityType: "Department",
                entityId: department.id,
                ipAddress: actor.ipAddress,
                userAgent: actor.userAgent,
                metadata: input,
            });

            return toDepartmentDTO(department);
        } catch (error) {
            this.handleUniqueConstraint(error);
        }
    }

    async deactivate(id: string, actor: ActorContext) {
        const existing = await this.departmentRepository.findById(id);
        if (!existing) throw new AppError("Department not found", HTTP_STATUS.NOT_FOUND);

        const department = await this.departmentRepository.deactivate(id);
        await this.activityLogRepository.create({
            userId: actor.userId,
            action: "DEPARTMENT_DEACTIVATED",
            entityType: "Department",
            entityId: department.id,
            ipAddress: actor.ipAddress,
            userAgent: actor.userAgent,
            metadata: { name: department.name, code: department.code },
        });

        return toDepartmentDTO(department);
    }

    private async assertUniqueNameAndCode(name: string, code: string, excludeId?: string) {
        const existing = await this.departmentRepository.findByNameOrCode(name, code, excludeId);
        if (existing) throw new AppError("Department name or code already exists", HTTP_STATUS.CONFLICT);
    }

    private async assertParentIsActive(parentDepartmentId: string | null | undefined) {
        if (!parentDepartmentId) return;

        const parent = await this.departmentRepository.findActiveById(parentDepartmentId);
        if (!parent) throw new AppError("Parent department must be active", HTTP_STATUS.BAD_REQUEST);
    }

    private async assertHeadIsEligible(headId: string | null | undefined) {
        if (!headId) return;

        const head = await this.departmentRepository.findEligibleHead(headId);
        if (!head) throw new AppError("Department head must be an active admin or department head", HTTP_STATUS.BAD_REQUEST);
    }

    private async assertNoHierarchyCycle(departmentId: string, parentDepartmentId: string) {
        const parentChainIds = await this.departmentRepository.getParentChainIds(parentDepartmentId);
        if (parentChainIds.includes(departmentId)) {
            throw new AppError("Department hierarchy cannot contain a cycle", HTTP_STATUS.BAD_REQUEST);
        }
    }

    private handleUniqueConstraint(error: unknown): never {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            throw new AppError("Department name or code already exists", HTTP_STATUS.CONFLICT);
        }

        throw error;
    }
}
