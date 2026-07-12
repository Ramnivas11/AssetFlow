import { Role } from "@prisma/client";
import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { auditDiscrepancies, closeAudit, createAudit, getAudit, listAudits, verifyAuditItem } from "./audit.controller";
import { auditIdSchema, auditItemSchema, auditListSchema, createAuditSchema } from "./audit.validation";

const router = Router();
router.use(authenticate);
router.get("/", authorize(Role.ADMIN, Role.ASSET_MANAGER, Role.DEPARTMENT_HEAD, Role.EMPLOYEE), validate(auditListSchema), listAudits);
router.get("/:id", authorize(Role.ADMIN, Role.ASSET_MANAGER, Role.DEPARTMENT_HEAD, Role.EMPLOYEE), validate(auditIdSchema), getAudit);
router.post("/", authorize(Role.ADMIN, Role.ASSET_MANAGER), validate(createAuditSchema), createAudit);
router.patch("/:id/items/:itemId", authorize(Role.ADMIN, Role.ASSET_MANAGER, Role.DEPARTMENT_HEAD, Role.EMPLOYEE), validate(auditItemSchema), verifyAuditItem);
router.patch("/:id/close", authorize(Role.ADMIN, Role.ASSET_MANAGER), validate(auditIdSchema), closeAudit);
router.get("/:id/discrepancies", authorize(Role.ADMIN, Role.ASSET_MANAGER, Role.DEPARTMENT_HEAD), validate(auditIdSchema), auditDiscrepancies);
export default router;
