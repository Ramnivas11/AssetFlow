import { Router } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

router.get("/", async (_, res) => {
    await prisma.$queryRaw`SELECT NOW()`;

    res.json({
        success: true,
        message: "Database Connected",
    });
});

export default router;