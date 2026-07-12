import { Role } from "@prisma/client";
import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { createTransfer, decideTransfer, listTransfers } from "./transfer.controller";
import { createTransferSchema, decideTransferSchema, transferListSchema } from "./transfer.validation";

const router = Router();
router.use(authenticate);
router.get("/", authorize(Role.ADMIN, Role.ASSET_MANAGER, Role.DEPARTMENT_HEAD, Role.EMPLOYEE), validate(transferListSchema), listTransfers);
router.post("/", authorize(Role.ADMIN, Role.ASSET_MANAGER, Role.DEPARTMENT_HEAD, Role.EMPLOYEE), validate(createTransferSchema), createTransfer);
router.patch("/:id/decision", authorize(Role.ADMIN, Role.ASSET_MANAGER, Role.DEPARTMENT_HEAD), validate(decideTransferSchema), decideTransfer);
export default router;
