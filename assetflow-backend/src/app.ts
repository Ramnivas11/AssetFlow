import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import healthRoutes from "./routes/health.routes";
import { requestLogger } from "./middlewares/logger.middleware";
import { notFound } from "./middlewares/notFound.middleware";
import { errorHandler } from "./middlewares/error.middleware";
import { env } from "./config/env";
import { authRoutes } from "./modules/auth";
import { departmentRoutes } from "./modules/department";
import { employeeRoutes } from "./modules/employee";
import { activityLogRoutes } from "./modules/activity-log";
import { allocationRoutes } from "./modules/allocation";
import { assetCategoryRoutes } from "./modules/asset-category";
import { assetRoutes } from "./modules/assets";
import { auditRoutes } from "./modules/audit";
import { bookingRoutes } from "./modules/booking";
import { dashboardRoutes } from "./modules/dashboard";
import { maintenanceRoutes } from "./modules/maintenance";
import { notificationRoutes } from "./modules/notification";
import { reportRoutes } from "./modules/report";
import { transferRoutes } from "./modules/transfer";
const app = express();

app.use(
    cors({
        origin: env.CLIENT_URL,
        credentials: true,
    })
);

app.use(helmet());
app.use(requestLogger);
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use("/api/v1/health", healthRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/departments", departmentRoutes);
app.use("/api/v1/employees", employeeRoutes);
app.use("/api/v1/asset-categories", assetCategoryRoutes);
app.use("/api/v1/assets", assetRoutes);
app.use("/api/v1/allocations", allocationRoutes);
app.use("/api/v1/transfers", transferRoutes);
app.use("/api/v1/bookings", bookingRoutes);
app.use("/api/v1/maintenance", maintenanceRoutes);
app.use("/api/v1/audits", auditRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/activity-logs", activityLogRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1/reports", reportRoutes);
app.use(notFound);

app.use(errorHandler);

export default app;
