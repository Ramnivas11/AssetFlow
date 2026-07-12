import cookieParser from "cookie-parser";
import healthRoutes from "./routes/health.routes";
import { requestLogger } from "./middlewares/logger.middleware";
import { notFound } from "./middlewares/notFound.middleware";
import { errorHandler } from "./middlewares/error.middleware";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
const app = express();

app.use(
    cors({
        origin: process.env.CLIENT_URL,
        credentials: true,
    })
);

app.use(helmet());
app.use(requestLogger);
app.use(compression());
app.use("/api/v1/health", healthRoutes);
app.use("/api/v1/db", dbRoutes);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(notFound);
app.use(errorHandler);

export default app;
