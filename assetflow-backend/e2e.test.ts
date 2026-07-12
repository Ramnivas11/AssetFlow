import { prisma } from "./src/lib/prisma";
const BASE_URL = "http://localhost:5000/api/v1";

let globalCookie = "";
let globalToken = "";

async function fetchApi(path: string, options: RequestInit = {}) {
    const headers: any = {
        "Content-Type": "application/json",
        ...options.headers
    };
    if (globalToken) headers["Authorization"] = `Bearer ${globalToken}`;
    if (globalCookie) headers["Cookie"] = globalCookie;

    const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
    
    // Save cookies (naive approach for test)
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) globalCookie = setCookie;

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`API Error ${res.status}: ${err}`);
    }
    return res.json();
}

async function run() {
    console.log("Seeding Admin User...");
    let admin = await prisma.user.findFirst({ where: { email: "admin@assetflow.io" } });
    if (!admin) {
        console.log("Admin not found. Will create via API.");
    }

    try {
        console.log("\n--- Testing Signup ---");
        try {
            const signupRes = await fetchApi("/auth/signup", {
                method: "POST",
                body: JSON.stringify({
                    name: "System Admin",
                    email: "admin@assetflow.io",
                    password: "Admin@12345!"
                })
            });
            console.log("Signup success:", signupRes.message);
        } catch (e: any) {
            console.log("Signup failed (might already exist):", e.message);
        }

        console.log("\n--- Testing Login ---");
        await prisma.user.updateMany({
            where: { email: "admin@assetflow.io" },
            data: { role: "ADMIN" }
        });
        console.log("Set admin role in DB.");

        const loginRes = await fetchApi("/auth/login", {
            method: "POST",
            body: JSON.stringify({
                email: "admin@assetflow.io",
                password: "Admin@12345!"
            })
        });
        globalToken = loginRes.data.accessToken;
        console.log("Login success, token received.");

        console.log("\n--- Testing Department Creation ---");
        const uniqueId = Date.now();
        const deptRes = await fetchApi("/departments", {
            method: "POST",
            body: JSON.stringify({
                name: "IT Operations Test " + uniqueId,
                code: "IT-OPS-" + uniqueId,
                headId: null,
                parentDepartmentId: null
            })
        });
        const deptId = deptRes.data.id;
        console.log("Department created:", deptRes.data.name);

        console.log("\n--- Testing Category Creation ---");
        const catRes = await fetchApi("/asset-categories", {
            method: "POST",
            body: JSON.stringify({
                name: "Laptops Test " + uniqueId,
                description: "Test laptops",
                dynamicFields: [{ key: "ram", label: "RAM (GB)", type: "NUMBER" }]
            })
        });
        const catId = catRes.data.id;
        console.log("Category created:", catRes.data.name);

        console.log("\n--- Testing Asset Registration ---");
        const assetRes = await fetchApi("/assets", {
            method: "POST",
            body: JSON.stringify({
                name: "MacBook Pro Test",
                serialNumber: "SN-" + uniqueId,
                categoryId: catId,
                departmentId: deptId,
                location: "Server Room",
                purchaseDate: new Date().toISOString(),
                purchaseCost: 2000,
                currentCondition: "GOOD",
                isBookable: true
            })
        });
        const assetId = assetRes.data.id;
        console.log("Asset created:", assetRes.data.assetTag);

        console.log("\n--- Testing Asset Allocation ---");
        const allocRes = await fetchApi("/allocations", {
            method: "POST",
            body: JSON.stringify({
                assetId: assetId,
                employeeId: null, // Allocate to department
                departmentId: deptId,
                expectedReturnDate: new Date(Date.now() + 86400000 * 7).toISOString() // 7 days from now
            })
        });
        const allocId = allocRes.data.id;
        console.log("Asset allocated, ID:", allocId);

        console.log("\n--- Testing Maintenance Request ---");
        const maintRes = await fetchApi("/maintenance", {
            method: "POST",
            body: JSON.stringify({
                assetId: assetId,
                issue: "Screen flickering",
                priority: "HIGH",
                conditionBefore: "GOOD"
            })
        });
        const maintId = maintRes.data.id;
        console.log("Maintenance requested, ID:", maintId);

        console.log("\n--- Testing Asset Return ---");
        const returnRes = await fetchApi(`/allocations/${allocId}/return`, {
            method: "PATCH",
            body: JSON.stringify({
                conditionOnReturn: "FAIR",
                returnNotes: "Minor scratches"
            })
        });
        console.log("Asset returned successfully, ID:", returnRes.data.id);

        console.log("\n--- Done ---");
    } catch (e: any) {
        console.error("Test failed!");
        console.error(e.message);
    }
}

run();
