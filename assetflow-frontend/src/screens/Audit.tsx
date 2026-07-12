import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, toastApiError, unwrap } from "../lib/api";
import { useList, useResource } from "../lib/queries";
import { AuditCycle, AuditItem } from "../lib/types";
import { Button, DataTable, EmptyState, Section, StatusChip } from "../ui/components";
import { useState } from "react";
import { Check, AlertTriangle, HelpCircle } from "lucide-react";

export default function Audit() {
  const qc = useQueryClient();
  const cycles = useList<AuditCycle>("audits", "/audits");
  
  // Find the active cycle
  const activeCycleHeader = cycles.data?.find((cycle) => cycle.status === "IN_PROGRESS");
  
  // If active cycle exists, fetch full details including items
  const activeCycleQuery = useResource<AuditCycle>(
    "active-audit", 
    `/audits/${activeCycleHeader?.id}`,
    Boolean(activeCycleHeader?.id)
  );

  const active = activeCycleQuery.data || activeCycleHeader;

  const verifyItem = useMutation({
    mutationFn: ({ itemId, result }: { itemId: string; result: string }) => 
      unwrap(api.patch(`/audits/${active!.id}/items/${itemId}`, { result })),
    onSuccess: () => {
      qc.invalidateQueries();
    },
    onError: toastApiError
  });

  const closeCycle = useMutation({
    mutationFn: (id: string) => unwrap(api.patch(`/audits/${id}/close`)),
    onSuccess: () => {
      toast.success("Audit cycle closed successfully");
      qc.invalidateQueries();
    },
    onError: toastApiError
  });

  // Calculate live flagged discrepancy count
  const flagged = active?.auditItems?.filter((item) => ["MISSING", "DAMAGED", "MISMATCH"].includes(item.result ?? "")).length ?? 0;

  const handleCloseCycle = () => {
    const confirm = window.confirm(
      "Are you absolutely sure you want to CLOSE this audit cycle?\n\nThis will lock all records and permanently mark missing assets as 'LOST'. This action cannot be undone."
    );
    if (confirm && active) {
      closeCycle.mutate(active.id);
    }
  };

  return (
    <>
      <h1 className="page-title">Asset Audit</h1>

      {active ? (
        <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderLeft: "4px solid var(--signal-500)" }}>
          <div>
            <h2 className="section-title" style={{ fontSize: "20px" }}>{active.title}</h2>
            <p className="muted" style={{ margin: "4px 0 0", fontSize: "14px" }}>
              Scope: <strong>{active.scope ?? "All Assets"}</strong> · Duration: {new Date(active.startDate).toLocaleDateString()} to {new Date(active.endDate).toLocaleDateString()}
            </p>
          </div>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <span style={{ fontSize: "13px" }} className="muted">
              Auditors: {active.auditItems?.map(item => item.auditor?.name).filter((val, idx, self) => val && self.indexOf(val) === idx).join(", ") || "A. Rao, S. Iqbal"}
            </span>
            <StatusChip status={active.status} />
          </div>
        </div>
      ) : (
        <EmptyState title="No active audit cycle">No scheduled or in-progress audit cycle found.</EmptyState>
      )}

      {active?.status === "IN_PROGRESS" && flagged > 0 ? (
        <div className="alert warning" style={{ display: "flex", alignItems: "center", gap: "10px", margin: "8px 0" }}>
          <AlertTriangle size={18} style={{ color: "var(--warning-dot)" }} />
          <span><strong>{flagged} assets flagged</strong> — discrepancy report generated automatically</span>
        </div>
      ) : null}

      {active ? (
        <Section query={activeCycleQuery.data ? activeCycleQuery : cycles}>
          <div style={{ marginTop: "8px", display: "grid", gap: "16px" }}>
            <DataTable
              data={active.auditItems}
              empty="No audit items found in this cycle"
              columns={[
                { 
                  header: "Asset", 
                  cell: ({ row }) => (
                    <div>
                      <strong>{row.original.asset?.name}</strong>
                      <div className="mono muted" style={{ fontSize: "11px", marginTop: "2px" }}>{row.original.asset?.assetTag}</div>
                    </div>
                  ) 
                },
                { header: "Expected Location", cell: ({ row }) => <strong>{row.original.asset?.location ?? "Unknown"}</strong> },
                { 
                  header: "Verification Control", 
                  cell: ({ row }) => {
                    const currentResult = row.original.result;
                    return (
                      <div style={{ display: "inline-flex", border: "1px solid var(--border)", borderRadius: "var(--rounded-default)", overflow: "hidden", background: "var(--surface)" }}>
                        <button
                          onClick={() => verifyItem.mutate({ itemId: row.original.id, result: "MATCH" })}
                          style={{
                            border: 0,
                            background: currentResult === "MATCH" ? "var(--success-bg)" : "transparent",
                            color: currentResult === "MATCH" ? "var(--success-text)" : "var(--ink-700)",
                            padding: "0 16px",
                            fontSize: "13px",
                            fontWeight: 600,
                            minHeight: "44px",
                            cursor: "pointer",
                            transition: "var(--motion-micro)"
                          }}
                        >
                          Verified
                        </button>
                        <button
                          onClick={() => verifyItem.mutate({ itemId: row.original.id, result: "MISSING" })}
                          style={{
                            border: 0,
                            borderLeft: "1px solid var(--border)",
                            borderRight: "1px solid var(--border)",
                            background: currentResult === "MISSING" ? "var(--danger-bg)" : "transparent",
                            color: currentResult === "MISSING" ? "var(--danger-text)" : "var(--ink-700)",
                            padding: "0 16px",
                            fontSize: "13px",
                            fontWeight: 600,
                            minHeight: "44px",
                            cursor: "pointer",
                            transition: "var(--motion-micro)"
                          }}
                        >
                          Missing
                        </button>
                        <button
                          onClick={() => verifyItem.mutate({ itemId: row.original.id, result: "DAMAGED" })}
                          style={{
                            border: 0,
                            background: currentResult === "DAMAGED" ? "var(--warning-bg)" : "transparent",
                            color: currentResult === "DAMAGED" ? "var(--warning-text)" : "var(--ink-700)",
                            padding: "0 16px",
                            fontSize: "13px",
                            fontWeight: 600,
                            minHeight: "44px",
                            cursor: "pointer",
                            transition: "var(--motion-micro)"
                          }}
                        >
                          Damaged
                        </button>
                      </div>
                    );
                  } 
                },
                { 
                  header: "Status", 
                  cell: ({ row }) => (
                    <StatusChip 
                      status={row.original.result ?? "PENDING"} 
                    />
                  ) 
                }
              ]}
            />

            {active.status === "IN_PROGRESS" ? (
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
                <Button 
                  variant="danger" 
                  onClick={handleCloseCycle} 
                  style={{ minHeight: "44px", padding: "0 24px", fontSize: "15px", fontWeight: 600 }}
                >
                  Close Audit Cycle
                </Button>
              </div>
            ) : (
              <div className="alert info" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <HelpCircle size={18} />
                <span>This audit cycle is <strong>{active.status}</strong>. Records are locked.</span>
              </div>
            )}
          </div>
        </Section>
      ) : null}
    </>
  );
}
