import { Prisma, PrismaClient } from "@prisma/client";

import { prisma } from "../../lib/prisma";

export class ActivityLogRepository {
    constructor(private readonly db: PrismaClient | Prisma.TransactionClient = prisma) {}

    create(data: Prisma.ActivityLogUncheckedCreateInput) {
        return this.db.activityLog.create({ data });
    }
}
