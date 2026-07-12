import { BarChart3, Bell, Building2, CalendarDays, ClipboardCheck, Gauge, HardDrive, LifeBuoy, Settings, ShieldCheck } from "lucide-react";
import { Role } from "./types";

export const navItems = [
  { label: "Dashboard", path: "/dashboard", icon: Gauge, roles: ["ADMIN", "ASSET_MANAGER", "DEPARTMENT_HEAD", "EMPLOYEE"] },
  { label: "Organization Setup", path: "/organization", icon: Building2, roles: ["ADMIN"] },
  { label: "Assets", path: "/assets", icon: HardDrive, roles: ["ADMIN", "ASSET_MANAGER", "DEPARTMENT_HEAD"] },
  { label: "Allocation & Transfer", path: "/allocation-transfer", icon: ShieldCheck, roles: ["ADMIN", "ASSET_MANAGER", "DEPARTMENT_HEAD"] },
  { label: "Resource Booking", path: "/booking", icon: CalendarDays, roles: ["ADMIN", "ASSET_MANAGER", "DEPARTMENT_HEAD", "EMPLOYEE"] },
  { label: "Maintenance", path: "/maintenance", icon: LifeBuoy, roles: ["ADMIN", "ASSET_MANAGER", "EMPLOYEE"] },
  { label: "Audit", path: "/audit", icon: ClipboardCheck, roles: ["ADMIN", "ASSET_MANAGER"] },
  { label: "Reports", path: "/reports", icon: BarChart3, roles: ["ADMIN", "ASSET_MANAGER", "DEPARTMENT_HEAD"] },
  { label: "Notifications", path: "/notifications", icon: Bell, roles: ["ADMIN", "ASSET_MANAGER", "DEPARTMENT_HEAD", "EMPLOYEE"] },
  { label: "Settings", path: "/settings", icon: Settings, roles: ["ADMIN", "ASSET_MANAGER", "DEPARTMENT_HEAD", "EMPLOYEE"] },
] satisfies Array<{ label: string; path: string; icon: typeof Gauge; roles: Role[] }>;

export const visibleNav = (role?: Role) => navItems.filter((item) => role && item.roles.includes(role));
