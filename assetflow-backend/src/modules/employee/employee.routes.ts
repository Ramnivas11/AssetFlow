import { Role } from "@prisma/client";
import { Router } from "express";

import { authenticate, authorize } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import {
    getEmployee,
    listEmployees,
    updateEmployeeRole,
    updateEmployeeStatus,
} from "./employee.controller";
import {
    employeeIdSchema,
    employeeListSchema,
    updateEmployeeRoleSchema,
    updateEmployeeStatusSchema,
} from "./employee.validation";

const router = Router();

router.use(authenticate);

router.get(
    "/",
    authorize(Role.ADMIN, Role.ASSET_MANAGER, Role.DEPARTMENT_HEAD),
    validate(employeeListSchema),
    listEmployees
);
router.get(
    "/:id",
    authorize(Role.ADMIN, Role.ASSET_MANAGER, Role.DEPARTMENT_HEAD),
    validate(employeeIdSchema),
    getEmployee
);
router.patch(
    "/:id/role",
    authorize(Role.ADMIN),
    validate(updateEmployeeRoleSchema),
    updateEmployeeRole
);
router.patch(
    "/:id/status",
    authorize(Role.ADMIN),
    validate(updateEmployeeStatusSchema),
    updateEmployeeStatus
);

export default router;
