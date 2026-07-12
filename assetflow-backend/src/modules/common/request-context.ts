import { AuthenticatedRequest } from "../../middlewares/auth.middleware";

export const getActor = (req: AuthenticatedRequest) => ({
    userId: req.auth!.userId,
    role: req.auth!.role,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
});
