import { PrismaClient, Role } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

const main = async () => {
    const password = await hashPassword("Password123!");

    const operations = await prisma.department.upsert({
        where: { name: "Operations" },
        update: {},
        create: { name: "Operations", code: "OPS" },
    });
    const it = await prisma.department.upsert({
        where: { name: "IT" },
        update: { parentDepartmentId: operations.id },
        create: { name: "IT", code: "IT", parentDepartmentId: operations.id },
    });

    const electronics = await prisma.assetCategory.upsert({
        where: { name: "Electronics" },
        update: {},
        create: { name: "Electronics", description: "Laptops, displays, mobile devices", dynamicFields: [{ key: "processor", label: "Processor", type: "text" }] },
    });
    const vehicles = await prisma.assetCategory.upsert({
        where: { name: "Vehicles" },
        update: {},
        create: { name: "Vehicles", description: "Company vehicles", dynamicFields: [{ key: "plate", label: "License Plate", type: "text" }] },
    });

    await prisma.user.upsert({ where: { email: "admin@assetflow.local" }, update: {}, create: { name: "Admin User", email: "admin@assetflow.local", password, role: Role.ADMIN, departmentId: operations.id } });
    const manager = await prisma.user.upsert({ where: { email: "manager@assetflow.local" }, update: {}, create: { name: "Asset Manager", email: "manager@assetflow.local", password, role: Role.ASSET_MANAGER, departmentId: operations.id } });
    const head = await prisma.user.upsert({ where: { email: "head@assetflow.local" }, update: {}, create: { name: "Department Head", email: "head@assetflow.local", password, role: Role.DEPARTMENT_HEAD, departmentId: it.id } });
    await prisma.department.update({ where: { id: it.id }, data: { headId: head.id } });
    await prisma.user.upsert({ where: { email: "employee@assetflow.local" }, update: {}, create: { name: "Employee One", email: "employee@assetflow.local", password, role: Role.EMPLOYEE, departmentId: it.id } });
    await prisma.user.upsert({ where: { email: "auditor@assetflow.local" }, update: {}, create: { name: "Auditor User", email: "auditor@assetflow.local", password, role: Role.EMPLOYEE, departmentId: operations.id } });

    const assets = [
        { assetTag: "AF-0001", serialNumber: "SN-LAP-001", name: "Lenovo ThinkPad", categoryId: electronics.id, departmentId: it.id, location: "HQ-IT", purchaseCost: 1200, status: "AVAILABLE" as const },
        { assetTag: "AF-0002", serialNumber: "SN-MON-001", name: "Dell Monitor", categoryId: electronics.id, departmentId: it.id, location: "HQ-IT", purchaseCost: 320, status: "ALLOCATED" as const },
        { assetTag: "AF-0003", serialNumber: "SN-CAR-001", name: "Pool Car", categoryId: vehicles.id, departmentId: operations.id, location: "Garage", purchaseCost: 18000, status: "AVAILABLE" as const },
        { assetTag: "AF-0004", serialNumber: "SN-RTR-001", name: "Cisco Router", categoryId: electronics.id, departmentId: it.id, location: "Server Room", purchaseCost: 950, status: "UNDER_MAINTENANCE" as const },
        { assetTag: "AF-0005", serialNumber: "SN-OLD-001", name: "Retired Laptop", categoryId: electronics.id, departmentId: it.id, location: "Storage", purchaseCost: 600, status: "RETIRED" as const },
    ];

    for (const asset of assets) {
        await prisma.asset.upsert({
            where: { assetTag: asset.assetTag },
            update: {},
            create: { ...asset, purchaseDate: new Date("2024-01-01"), currentCondition: "GOOD", isBookable: true, qrCodeValue: asset.assetTag },
        });
    }

    await prisma.activityLog.create({ data: { userId: manager.id, action: "SEED_COMPLETED", entityType: "System", metadata: { departments: 2, assets: assets.length } } });
};

main()
    .finally(async () => {
        await prisma.$disconnect();
    })
    .catch(async (error) => {
        console.error(error);
        await prisma.$disconnect();
        process.exit(1);
    });
