import { AssetCondition, AssetStatus, PrismaClient, Role } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

import { prisma } from "../src/lib/prisma";

const main = async () => {
    const password = await hashPassword("Password123!");

    console.log("Cleaning up existing database records...");
    await prisma.activityLog.deleteMany({});
    await prisma.booking.deleteMany({});
    await prisma.allocationRecord.deleteMany({});
    await prisma.maintenanceRequest.deleteMany({});
    await prisma.transferRequest.deleteMany({});
    await prisma.auditItem.deleteMany({});
    await prisma.auditCycle.deleteMany({});
    await prisma.document.deleteMany({});
    await prisma.asset.deleteMany({});
    await prisma.assetCategory.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.department.deleteMany({});

    console.log("Seeding departments...");
    const operations = await prisma.department.create({
        data: { name: "Operations", code: "OPS" }
    });
    const it = await prisma.department.create({
        data: { name: "IT", code: "IT", parentDepartmentId: operations.id }
    });

    console.log("Seeding users...");
    const admin = await prisma.user.create({
        data: { name: "Admin User", email: "admin@assetflow.local", password, role: Role.ADMIN, departmentId: operations.id }
    });
    const manager = await prisma.user.create({
        data: { name: "Asset Manager", email: "manager@assetflow.local", password, role: Role.ASSET_MANAGER, departmentId: operations.id }
    });
    const head = await prisma.user.create({
        data: { name: "Department Head", email: "head@assetflow.local", password, role: Role.DEPARTMENT_HEAD, departmentId: it.id }
    });
    await prisma.department.update({
        where: { id: it.id },
        data: { headId: head.id }
    });
    const employee = await prisma.user.create({
        data: { name: "Employee One", email: "employee@assetflow.local", password, role: Role.EMPLOYEE, departmentId: it.id }
    });
    await prisma.user.create({
        data: { name: "Auditor User", email: "auditor@assetflow.local", password, role: Role.EMPLOYEE, departmentId: operations.id }
    });

    const categorySpecs = [
        {
            name: "Electronics",
            description: "Enterprise laptops, screens, tablets, and personal devices",
            dynamicFields: [{ key: "processor", label: "Processor", type: "TEXT" }],
            items: [
                "Laptop", "Desktop Computer", "Monitor", "Keyboard", "Mouse",
                "Docking Station", "Printer", "Scanner", "Projector", "Tablet",
                "Mobile Phone", "Webcam", "Headphones", "Microphone", "Smart TV",
                "Router", "Switch", "Firewall Appliance", "NAS Storage", "UPS"
            ]
        },
        {
            name: "🪑 Furniture",
            description: "Desks, executive chairs, conference room setups, and storage racks",
            dynamicFields: [{ key: "material", label: "Material", type: "TEXT" }],
            items: [
                "Office Chair", "Executive Chair", "Desk", "Standing Desk", "Conference Table",
                "Meeting Chair", "Reception Desk", "Filing Cabinet", "Locker", "Bookshelf",
                "Whiteboard", "Notice Board", "Sofa", "Coffee Table", "Workstation Cubicle"
            ]
        },
        {
            name: "🚗 Vehicles",
            description: "Corporate cars, shuttle buses, and site-bound industrial vehicles",
            dynamicFields: [{ key: "plate", label: "License Plate", type: "TEXT" }],
            items: [
                "Company Car", "SUV", "Van", "Bus", "Bike", "Electric Scooter",
                "Forklift", "Golf Cart", "Delivery Vehicle", "Ambulance"
            ]
        },
        {
            name: "🏢 Rooms & Shared Resources (Bookable)",
            description: "Assignable conference areas, shared labs, and auditoriums",
            dynamicFields: [{ key: "capacity", label: "Capacity (people)", type: "NUMBER" }],
            items: [
                "Conference Room A", "Conference Room B", "Training Room", "Interview Room",
                "Auditorium", "Board Room", "Innovation Lab", "Computer Lab", "Library Room",
                "Cafeteria Hall"
            ]
        },
        {
            name: "🏭 Manufacturing Equipment",
            description: "Production machinery, lathe systems, and presses",
            dynamicFields: [{ key: "power", label: "Power Rating (kW)", type: "NUMBER" }],
            items: [
                "CNC Machine", "Lathe Machine", "Milling Machine", "Drill Press", "Conveyor Belt",
                "Welding Machine", "Air Compressor", "Generator", "Hydraulic Press", "Packaging Machine"
            ]
        },
        {
            name: "🏥 Hospital Equipment",
            description: "Clinical devices, diagnostic scanners, and support tools",
            dynamicFields: [{ key: "calibration", label: "Last Calibration", type: "DATE" }],
            items: [
                "Hospital Bed", "ECG Machine", "X-Ray Machine", "Ultrasound Machine", "MRI Scanner",
                "Ventilator", "Defibrillator", "Wheelchair", "Infusion Pump", "Oxygen Cylinder"
            ]
        },
        {
            name: "🎓 Educational Equipment",
            description: "Teaching aids, classroom projectors, and micro-kits",
            dynamicFields: [{ key: "room", label: "Assigned Room", type: "TEXT" }],
            items: [
                "Classroom Projector", "Smart Board", "Laboratory Microscope", "Laboratory Computer",
                "Robotics Kit", "3D Printer", "Camera", "Drone", "Speaker System", "Attendance Device"
            ]
        },
        {
            name: "🔧 Tools",
            description: "Drills, field kits, ladders, and diagnostic sensors",
            dynamicFields: [{ key: "voltage", label: "Operating Voltage", type: "TEXT" }],
            items: [
                "Hammer Drill", "Impact Driver", "Tool Kit", "Ladder", "Measuring Instrument",
                "Generator", "Air Pump", "Soldering Station", "Heat Gun", "Power Saw"
            ]
        },
        {
            name: "📦 Warehouse",
            description: "Scanners, pallet movers, racks, and weighing configurations",
            dynamicFields: [{ key: "aisle", label: "Aisle Location", type: "TEXT" }],
            items: [
                "Barcode Scanner", "Pallet Jack", "Pallet Rack", "Storage Bin", "Packaging Table",
                "Weighing Machine", "RFID Reader", "Conveyor Cart"
            ]
        },
        {
            name: "🌐 Networking",
            description: "Switches, access points, and rack cabinets",
            dynamicFields: [{ key: "ports", label: "Number of Ports", type: "NUMBER" }],
            items: [
                "Router", "Managed Switch", "Access Point", "Firewall", "Server",
                "Rack Cabinet", "Patch Panel", "Network Cable Tester", "Fiber Module"
            ]
        },
        {
            name: "📷 Media",
            description: "DSLR cameras, lenses, tripods, and recording systems",
            dynamicFields: [{ key: "resolution", label: "Max Resolution", type: "TEXT" }],
            items: [
                "DSLR Camera", "Mirrorless Camera", "Video Camera", "Tripod", "Gimbal",
                "Lighting Kit", "Drone", "Audio Recorder", "Streaming Kit"
            ]
        },
        {
            name: "🔐 Security",
            description: "CCTV units, badge readers, and door locking configurations",
            dynamicFields: [{ key: "ip", label: "IP Address", type: "TEXT" }],
            items: [
                "CCTV Camera", "Biometric Device", "Access Card Reader", "Security Alarm",
                "Fire Extinguisher", "Smoke Detector", "Door Lock System"
            ]
        },
        {
            name: "🧹 Maintenance",
            description: "Cleaning machinery, washers, and tool carts",
            dynamicFields: [{ key: "type", label: "Machine Type", type: "TEXT" }],
            items: [
                "Vacuum Cleaner", "Floor Cleaning Machine", "Pressure Washer", "Lawn Mower",
                "Generator", "Tool Cart"
            ]
        }
    ];

    console.log("Seeding categories and assets...");
    let assetIndex = 1;

    for (const spec of categorySpecs) {
        const category = await prisma.assetCategory.create({
            data: {
                name: spec.name,
                description: spec.description,
                dynamicFields: spec.dynamicFields
            }
        });

        for (const itemName of spec.items) {
            const tagNumber = String(assetIndex).padStart(4, "0");
            const assetTag = `AF-${tagNumber}`;
            const serialNumber = `SN-${itemName.replace(/\s+/g, "-").toUpperCase()}-${tagNumber}`;
            
            // Alternating department assignments
            const deptId = assetIndex % 2 === 0 ? it.id : operations.id;
            const location = assetIndex % 2 === 0 ? "HQ-IT-Desk" : "HQ-Operations-Bay";

            await prisma.asset.create({
                data: {
                    assetTag,
                    serialNumber,
                    name: itemName,
                    categoryId: category.id,
                    departmentId: deptId,
                    location,
                    purchaseDate: new Date("2025-01-15"),
                    purchaseCost: 850.00,
                    currentCondition: AssetCondition.GOOD,
                    status: assetIndex % 5 === 0 ? AssetStatus.ALLOCATED : AssetStatus.AVAILABLE,
                    isBookable: spec.name.includes("Shared") || itemName.includes("Room"),
                    qrCodeValue: assetTag
                }
            });

            assetIndex++;
        }
    }

    console.log(`Seeded ${categorySpecs.length} categories and ${assetIndex - 1} assets successfully!`);

    await prisma.activityLog.create({
        data: {
            userId: admin.id,
            action: "SEED_COMPLETED",
            entityType: "System",
            metadata: { categories: categorySpecs.length, assets: assetIndex - 1 }
        }
    });
};

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
