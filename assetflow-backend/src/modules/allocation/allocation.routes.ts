import { Role } from "@prisma/client";
import { Router } from "express";

import { authenticate, authorize } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { allocateAsset, listAllocations, returnAsset } from "./allocation.controller";
import { allocateAssetSchema, allocationListSchema, returnAssetSchema } from "./allocation.validation";

const router = Router();
router.use(authenticate);
router.get("/", authorize(Role.ADMIN, Role.ASSET_MANAGER, Role.DEPARTMENT_HEAD, Role.EMPLOYEE), validate(allocationListSchema), listAllocations);
router.post("/", authorize(Role.ADMIN, Role.ASSET_MANAGER), validate(allocateAssetSchema), allocateAsset);
router.patch("/:id/return", authorize(Role.ADMIN, Role.ASSET_MANAGER, Role.DEPARTMENT_HEAD), validate(returnAssetSchema), returnAsset);

export default router;
