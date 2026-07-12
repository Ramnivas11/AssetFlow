import { Role } from "@prisma/client";
import { Router } from "express";

import { authenticate, authorize } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { createCategory, deactivateCategory, getCategory, listCategories, updateCategory } from "./asset-category.controller";
import { categoryIdSchema, categoryListSchema, createCategorySchema, updateCategorySchema } from "./asset-category.validation";

const router = Router();
router.use(authenticate);
router.get("/", authorize(Role.ADMIN, Role.ASSET_MANAGER, Role.DEPARTMENT_HEAD, Role.EMPLOYEE), validate(categoryListSchema), listCategories);
router.get("/:id", authorize(Role.ADMIN, Role.ASSET_MANAGER, Role.DEPARTMENT_HEAD), validate(categoryIdSchema), getCategory);
router.post("/", authorize(Role.ADMIN, Role.ASSET_MANAGER), validate(createCategorySchema), createCategory);
router.patch("/:id", authorize(Role.ADMIN, Role.ASSET_MANAGER), validate(updateCategorySchema), updateCategory);
router.patch("/:id/deactivate", authorize(Role.ADMIN, Role.ASSET_MANAGER), validate(categoryIdSchema), deactivateCategory);

export default router;
