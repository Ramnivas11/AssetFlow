import { Role } from "@prisma/client";
import { Router } from "express";

import { authenticate, authorize } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import {
    createDepartment,
    deactivateDepartment,
    getDepartment,
    listDepartments,
    updateDepartment,
} from "./department.controller";
import {
    createDepartmentSchema,
    departmentIdSchema,
    departmentListSchema,
    updateDepartmentSchema,
} from "./department.validation";

const router = Router();

router.use(authenticate);

router.get(
    "/",
    authorize(Role.ADMIN, Role.ASSET_MANAGER, Role.DEPARTMENT_HEAD),
    validate(departmentListSchema),
    listDepartments
);
router.get(
    "/:id",
    authorize(Role.ADMIN, Role.ASSET_MANAGER, Role.DEPARTMENT_HEAD),
    validate(departmentIdSchema),
    getDepartment
);
router.post("/", authorize(Role.ADMIN), validate(createDepartmentSchema), createDepartment);
router.patch("/:id", authorize(Role.ADMIN), validate(updateDepartmentSchema), updateDepartment);
router.patch("/:id/deactivate", authorize(Role.ADMIN), validate(departmentIdSchema), deactivateDepartment);

export default router;
