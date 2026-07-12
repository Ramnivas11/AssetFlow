import { ActivityLogRepository } from "../activity-log/activity-log.repository";
import { EmployeeRepository } from "./employee.repository";
import { EmployeeService } from "./employee.service";

const employeeRepository = new EmployeeRepository();
const activityLogRepository = new ActivityLogRepository();

export const employeeService = new EmployeeService(employeeRepository, activityLogRepository);
