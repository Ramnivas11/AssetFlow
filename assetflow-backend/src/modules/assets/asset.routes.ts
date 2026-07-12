import { Role } from "@prisma/client";
import { Router } from "express";

import { authenticate, authorize } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { bulkAssetStatus, createAsset, deactivateAsset, getAsset, listAssets, updateAsset } from "./asset.controller";
import { assetIdSchema, assetListSchema, bulkAssetStatusSchema, createAssetSchema, updateAssetSchema } from "./asset.validation";

const router = Router();
router.use(authenticate);
router.get("/", authorize(Role.ADMIN, Role.ASSET_MANAGER, Role.DEPARTMENT_HEAD, Role.EMPLOYEE), validate(assetListSchema), listAssets);
router.get("/:id", authorize(Role.ADMIN, Role.ASSET_MANAGER, Role.DEPARTMENT_HEAD, Role.EMPLOYEE), validate(assetIdSchema), getAsset);
router.post("/", authorize(Role.ADMIN, Role.ASSET_MANAGER), validate(createAssetSchema), createAsset);
router.patch("/bulk/status", authorize(Role.ADMIN, Role.ASSET_MANAGER), validate(bulkAssetStatusSchema), bulkAssetStatus);
router.patch("/:id", authorize(Role.ADMIN, Role.ASSET_MANAGER), validate(updateAssetSchema), updateAsset);
router.patch("/:id/deactivate", authorize(Role.ADMIN, Role.ASSET_MANAGER), validate(assetIdSchema), deactivateAsset);

export default router;
