export type Role = "ADMIN" | "ASSET_MANAGER" | "DEPARTMENT_HEAD" | "EMPLOYEE";
export type ThemeMode = "light" | "dark" | "system";
export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  details?: unknown;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  departmentId: string | null;
  department?: Department | null;
}

export interface PageResult<T> {
  items: T[];
  meta?: { page: number; limit: number; total: number; totalPages: number };
}

export interface Department { id: string; name: string; code?: string; status: string; parentDepartmentId?: string | null; head?: User | null; parentDepartment?: Department | null; }
export interface Category { id: string; name: string; description?: string | null; dynamicFields?: Array<{ key: string; label: string; type: string }>; status: string; }
export interface Asset { id: string; assetTag: string; serialNumber: string; name: string; category?: Category; categoryId: string; department?: Department | null; departmentId?: string | null; status: string; location: string; currentCondition?: string; isBookable: boolean; purchaseDate?: string; purchaseCost?: string | number; imageUrl?: string | null; allocations?: Allocation[]; maintenance?: MaintenanceRequest[]; bookings?: Booking[]; description?: string | null; }
export interface Allocation { id: string; assetId: string; employeeId?: string | null; departmentId?: string | null; allocationStatus: string; expectedReturnDate?: string | null; allocatedAt: string; returnedAt?: string | null; returnNotes?: string | null; conditionOnReturn?: string | null; employee?: User | null; department?: Department | null; asset?: Asset; }
export interface TransferRequest { id: string; assetId: string; requestedById: string; targetEmployeeId?: string | null; targetDepartmentId?: string | null; reason: string; status: string; createdAt: string; asset?: Asset; requestedBy?: User; targetEmployee?: User | null; targetDepartment?: Department | null; }
export interface Booking { id: string; assetId: string; bookedById: string; startTime: string; endTime: string; title: string; description?: string | null; status: string; asset?: Asset; bookedBy?: User; }
export interface MaintenanceRequest { id: string; assetId: string; requestedById: string; technicianId?: string | null; issue: string; priority: string; status: string; createdAt: string; updatedAt: string; resolution?: string | null; conditionBefore?: string; conditionAfter?: string | null; asset?: Asset; technician?: User | null; }
export interface AuditCycle { id: string; title: string; scope?: string | null; departmentId?: string | null; startDate: string; endDate: string; status: string; auditItems?: AuditItem[]; }
export interface AuditItem { id: string; auditCycleId: string; assetId: string; auditorId: string; result?: string | null; remarks?: string | null; asset?: Asset; auditor?: User; }
export interface NotificationItem { id: string; title: string; message: string; type: string; read: boolean; createdAt: string; metadata?: unknown; }
export interface ActivityLog { id: string; action: string; entityType: string; entityId?: string | null; createdAt: string; user?: User | null; metadata?: unknown; }
