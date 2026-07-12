import { StatusTone } from "./types";

export const assetStatusTone: Record<string, StatusTone> = {
  AVAILABLE: "success",
  ALLOCATED: "info",
  RESERVED: "info",
  UNDER_MAINTENANCE: "warning",
  LOST: "danger",
  RETIRED: "neutral",
  DISPOSED: "neutral",
};

export const genericStatusTone = (status?: string): StatusTone => {
  const normalized = status ?? "";
  if (assetStatusTone[normalized]) return assetStatusTone[normalized];
  if (["MATCH", "VERIFIED", "RESOLVED", "APPROVED", "ACTIVE", "COMPLETED"].includes(normalized)) return "success";
  if (["PENDING", "IN_PROGRESS", "TASK_ASSIGNED", "WARNING"].includes(normalized)) return "warning";
  if (["MISSING", "DAMAGED", "REJECTED", "CANCELLED", "OVERDUE", "ALERT"].includes(normalized)) return "danger";
  if (["ALLOCATED", "INFO", "APPROVED"].includes(normalized)) return "info";
  return "neutral";
};

export const labelize = (value?: string | null) => (value ?? "Unknown").replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
