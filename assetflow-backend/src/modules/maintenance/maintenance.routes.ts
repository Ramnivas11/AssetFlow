import { Role } from "@prisma/client";
import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { createMaintenance, decideMaintenance, listMaintenance, updateMaintenanceStatus } from "./maintenance.controller";
import { createMaintenanceSchema, maintenanceDecisionSchema, maintenanceListSchema, maintenanceStatusSchema } from "./maintenance.validation";

const router = Router();
router.use(authenticate);
router.get("/", authorize(Role.ADMIN, Role.ASSET_MANAGER, Role.DEPARTMENT_HEAD, Role.EMPLOYEE), validate(maintenanceListSchema), listMaintenance);
router.post("/", authorize(Role.ADMIN, Role.ASSET_MANAGER, Role.DEPARTMENT_HEAD, Role.EMPLOYEE), validate(createMaintenanceSchema), createMaintenance);
router.patch("/:id/decision", authorize(Role.ADMIN, Role.ASSET_MANAGER), validate(maintenanceDecisionSchema), decideMaintenance);
router.patch("/:id/status", authorize(Role.ADMIN, Role.ASSET_MANAGER), validate(maintenanceStatusSchema), updateMaintenanceStatus);
export default router;
