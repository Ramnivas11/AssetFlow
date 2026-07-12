import { ActivityLogRepository } from "../activity-log/activity-log.repository";
import { DepartmentRepository } from "./department.repository";
import { DepartmentService } from "./department.service";

const departmentRepository = new DepartmentRepository();
const activityLogRepository = new ActivityLogRepository();

export const departmentService = new DepartmentService(departmentRepository, activityLogRepository);
