import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, toastApiError, unwrap } from "../lib/api";
import { useList } from "../lib/queries";
import { Allocation, Asset, TransferRequest, User } from "../lib/types";
import { DataTable, Section, StatusChip, WorkflowRail, Button, TextField, SelectField, TextAreaField, DatePicker } from "../ui/components";
import { useState } from "react";
import { useAuth } from "../state/auth";

export default function AllocationTransfer() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [assetId, setAssetId] = useState("");
  
  // Return Form State
  const [returnCondition, setReturnCondition] = useState("GOOD");
  const [returnNotes, setReturnNotes] = useState("");

  // Transfer Request Form State
  const [targetEmployeeId, setTargetEmployeeId] = useState("");
  const [transferReason, setTransferReason] = useState("");

  // Normal Allocation Form State
  const [allocType, setAllocType] = useState<"EMPLOYEE" | "DEPARTMENT">("EMPLOYEE");
  const [allocEmployeeId, setAllocEmployeeId] = useState("");
  const [allocDepartmentId, setAllocDepartmentId] = useState("");
  const [expectedReturnDate, setExpectedReturnDate] = useState("");

  const assets = useList<Asset>("assets", "/assets");
  const employees = useList<User>("employees", "/employees");
  const departments = useList<any>("departments", "/departments");
  
  const allocations = useList<Allocation>("allocations", assetId ? `/allocations?assetId=${assetId}` : "/allocations");
  const transfers = useList<TransferRequest>("transfers", "/transfers");

  const allocate = useMutation({
    mutationFn: (body: any) => unwrap(api.post("/allocations", body)),
    onSuccess: () => {
      toast.success("Asset allocated successfully");
      setAllocEmployeeId("");
      setAllocDepartmentId("");
      setExpectedReturnDate("");
      qc.invalidateQueries();
    },
    onError: toastApiError
  });

  const returnAsset = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => unwrap(api.patch(`/allocations/${id}/return`, body)),
    onSuccess: () => {
      toast.success("Asset returned successfully");
      setReturnNotes("");
      setReturnCondition("GOOD");
      qc.invalidateQueries();
    },
    onError: toastApiError
  });

  const requestTransfer = useMutation({
    mutationFn: (body: any) => unwrap(api.post("/transfers", body)),
    onSuccess: () => {
      toast.success("Transfer request submitted successfully");
      setTargetEmployeeId("");
      setTransferReason("");
      qc.invalidateQueries();
    },
    onError: toastApiError
  });

  const decideTransfer = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: "APPROVE" | "REJECT" }) => 
      unwrap(api.patch(`/transfers/${id}/decision`, { decision })),
    onSuccess: () => {
      toast.success("Transfer decision recorded");
      qc.invalidateQueries();
    },
    onError: toastApiError
  });

  const activeAllocation = allocations.data?.find((item) => item.allocationStatus === "ACTIVE");
  const selectedAsset = assets.data?.find((a) => a.id === assetId);
  const holder = activeAllocation?.employee || activeAllocation?.department;

  // Overdue status check
  const isOverdue = activeAllocation && 
                    activeAllocation.expectedReturnDate && 
                    new Date(activeAllocation.expectedReturnDate) < new Date();

  const formatAllocationHistory = (item: Allocation) => {
    const dateStr = new Date(item.allocatedAt).toLocaleDateString();
    const holderName = item.employee?.name || item.department?.name || "Holder";
    const deptName = item.employee?.department?.name || item.department?.name || "General";
    
    if (item.allocationStatus === "RETURNED") {
      return `${dateStr} — Returned by ${holderName} — condition: ${item.conditionOnReturn || "GOOD"}`;
    } else {
      const returnDateStr = item.expectedReturnDate ? ` (due ${new Date(item.expectedReturnDate).toLocaleDateString()})` : "";
      const statusStr = item.allocationStatus === "OVERDUE" || (item.allocationStatus === "ACTIVE" && new Date(item.expectedReturnDate || "") < new Date()) ? " [OVERDUE]" : "";
      return `${dateStr} — Allocated to ${holderName} — ${deptName}${returnDateStr}${statusStr}`;
    }
  };

  // Determine connected-node active step for the selected asset transfers
  const assetTransfers = transfers.data?.filter(t => t.assetId === assetId) || [];
  const latestTransfer = assetTransfers[0]; // newest first
  let workflowStep = 0;
  if (latestTransfer) {
    if (latestTransfer.status === "PENDING") workflowStep = 1;
    else if (latestTransfer.status === "APPROVED") workflowStep = 2;
    else if (latestTransfer.status === "REJECTED") workflowStep = 0;
  }

  return (
    <>
      <div className="toolbar">
        <h1 className="page-title">Allocation & Transfer</h1>
      </div>

      <div className="card grid" style={{ gap: "16px" }}>
        <h2 className="section-title">Select Asset</h2>
        <SelectField label="Asset" value={assetId} onChange={(event) => setAssetId(event.target.value)}>
          <option value="">Choose an asset to manage...</option>
          {assets.data?.map((asset) => (
            <option key={asset.id} value={asset.id}>
              {asset.assetTag} — {asset.name} ({asset.status})
            </option>
          ))}
        </SelectField>

        {selectedAsset && isOverdue ? (
          <div className="alert danger" style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <span>⚠️ <strong>Allocation Overdue:</strong> Expected return was {new Date(activeAllocation!.expectedReturnDate!).toLocaleDateString()}</span>
          </div>
        ) : null}

        {holder ? (
          <div className="alert danger" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <strong style={{ fontSize: "15px" }}>Already Allocated to {holder.name} ({activeAllocation?.employee?.department?.name || activeAllocation?.department?.name || "No Dept"})</strong>
            <span style={{ fontSize: "14px" }}>Direct re-allocation is blocked — submit a transfer request below.</span>
          </div>
        ) : null}
      </div>

      {selectedAsset ? (
        <div className="grid cols-2" style={{ marginTop: "8px" }}>
          {/* Action Form: Allocate OR Transfer */}
          {!holder ? (
            <section className="card grid" style={{ alignContent: "start", gap: "16px" }}>
              <h2 className="section-title">Allocate Asset</h2>
              
              <div style={{ display: "flex", gap: "16px", marginBottom: "8px" }}>
                <label style={{ display: "flex", gap: "6px", alignItems: "center", fontSize: "14px", fontWeight: 500 }}>
                  <input type="radio" checked={allocType === "EMPLOYEE"} onChange={() => setAllocType("EMPLOYEE")} />
                  Employee
                </label>
                <label style={{ display: "flex", gap: "6px", alignItems: "center", fontSize: "14px", fontWeight: 500 }}>
                  <input type="radio" checked={allocType === "DEPARTMENT"} onChange={() => setAllocType("DEPARTMENT")} />
                  Department
                </label>
              </div>

              {allocType === "EMPLOYEE" ? (
                <SelectField label="Employee" value={allocEmployeeId} onChange={(e) => setAllocEmployeeId(e.target.value)}>
                  <option value="">Choose Employee</option>
                  {employees.data?.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </SelectField>
              ) : (
                <SelectField label="Department" value={allocDepartmentId} onChange={(e) => setAllocDepartmentId(e.target.value)}>
                  <option value="">Choose Department</option>
                  {departments.data?.map((dept) => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </SelectField>
              )}

              <DatePicker 
                label="Expected Return Date" 
                value={expectedReturnDate} 
                onChange={setExpectedReturnDate} 
              />

              <Button 
                variant="primary" 
                onClick={() => allocate.mutate({
                  assetId,
                  employeeId: allocType === "EMPLOYEE" ? allocEmployeeId || null : null,
                  departmentId: allocType === "DEPARTMENT" ? allocDepartmentId || null : null,
                  expectedReturnDate: expectedReturnDate || null
                })}
                disabled={allocType === "EMPLOYEE" ? !allocEmployeeId : !allocDepartmentId}
              >
                Allocate Asset
              </Button>
            </section>
          ) : (
            <section className="card grid" style={{ alignContent: "start", gap: "16px" }}>
              <h2 className="section-title">Submit Transfer Request</h2>
              <div className="field">
                <label>From</label>
                <input className="input" value={holder.name} readOnly style={{ background: "var(--surface-sunken)", color: "var(--ink-500)" }} />
              </div>

              <SelectField label="To Employee" value={targetEmployeeId} onChange={(e) => setTargetEmployeeId(e.target.value)}>
                <option value="">Select Target Employee</option>
                {employees.data?.filter(emp => emp.id !== holder.id).map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </SelectField>

              <TextAreaField 
                label="Reason" 
                value={transferReason} 
                onChange={(e) => setTransferReason(e.target.value)} 
                placeholder="Why is this transfer necessary?"
              />

              <Button 
                variant="primary" 
                onClick={() => requestTransfer.mutate({
                  assetId,
                  targetEmployeeId,
                  reason: transferReason
                })}
                disabled={!targetEmployeeId || !transferReason}
              >
                Submit Request
              </Button>
            </section>
          )}

          {/* Return flow OR Workflow rail */}
          {holder ? (
            <section className="card grid" style={{ alignContent: "start", gap: "16px" }}>
              <h2 className="section-title">Return Asset Check-In</h2>
              <SelectField label="Return Condition" value={returnCondition} onChange={(e) => setReturnCondition(e.target.value)}>
                <option value="EXCELLENT">Excellent</option>
                <option value="GOOD">Good</option>
                <option value="FAIR">Fair</option>
                <option value="POOR">Poor</option>
                <option value="DAMAGED">Damaged</option>
              </SelectField>

              <TextAreaField 
                label="Check-In Notes" 
                value={returnNotes} 
                onChange={(e) => setReturnNotes(e.target.value)} 
                placeholder="Condition notes on return..."
              />

              <Button 
                variant="danger" 
                onClick={() => returnAsset.mutate({
                  id: activeAllocation!.id,
                  body: {
                    conditionOnReturn: returnCondition,
                    returnNotes: returnNotes
                  }
                })}
              >
                Perform Return Check-In
              </Button>
            </section>
          ) : (
            <section className="card grid" style={{ alignContent: "start", gap: "16px" }}>
              <h2 className="section-title">Transfer Workflow</h2>
              <p className="muted" style={{ fontSize: "13px", margin: 0 }}>
                Workflow stages for active transfer requests on this resource.
              </p>
              <WorkflowRail steps={["Requested", "Approved", "Re-allocated"]} activeIndex={workflowStep} />
              {latestTransfer ? (
                <div style={{ marginTop: "12px", display: "grid", gap: "4px", fontSize: "13px" }}>
                  <p style={{ margin: 0 }}><strong>Status:</strong> <StatusChip status={latestTransfer.status} /></p>
                  <p style={{ margin: 0 }}><strong>Reason:</strong> {latestTransfer.reason}</p>
                </div>
              ) : null}
            </section>
          )}
        </div>
      ) : null}

      {/* Allocation History list */}
      {selectedAsset ? (
        <section className="card grid" style={{ marginTop: "16px", gap: "12px" }}>
          <h2 className="section-title">Allocation History</h2>
          <div style={{ display: "grid", gap: "8px" }}>
            {allocations.data?.length ? (
              allocations.data.map((item) => (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "var(--surface-sunken)", borderRadius: "var(--rounded-default)", fontSize: "14px" }}>
                  <span>{formatAllocationHistory(item)}</span>
                  <StatusChip status={item.allocationStatus} />
                </div>
              ))
            ) : (
              <p className="muted" style={{ margin: 0, fontSize: "14px" }}>No allocation history recorded for this asset.</p>
            )}
          </div>
        </section>
      ) : null}

      {/* Active Transfer Requests Directory */}
      <section style={{ marginTop: "24px" }}>
        <h2 className="section-title" style={{ marginBottom: "12px" }}>Org-Wide Transfer Requests</h2>
        <Section query={transfers}>
          <DataTable
            data={transfers.data}
            empty="No transfer requests yet"
            columns={[
              { header: "Asset Tag", cell: ({ row }) => <span className="mono">{row.original.asset?.assetTag}</span> },
              { header: "Asset Name", cell: ({ row }) => <strong>{row.original.asset?.name}</strong> },
              { header: "From", cell: ({ row }) => row.original.requestedBy?.name ?? "Unknown" },
              { header: "To Target", cell: ({ row }) => row.original.targetEmployee?.name ?? row.original.targetDepartment?.name ?? "N/A" },
              { header: "Status", cell: ({ row }) => <StatusChip status={row.original.status === "APPROVED" && row.original.asset?.status !== "ALLOCATED" ? "DH_APPROVED" : row.original.status} /> },
              { header: "Reason", accessorKey: "reason" },
              { 
                header: "Actions", 
                cell: ({ row }) => {
                  const req = row.original;
                  const isPending = req.status === "PENDING";
                  const isApproved = req.status === "APPROVED";
                  const isNotAllocated = req.asset?.status !== "ALLOCATED";

                  if (isPending) {
                    return (
                      <div className="actions">
                        <Button style={{ minHeight: "32px", padding: "0 10px", fontSize: "13px" }} onClick={() => decideTransfer.mutate({ id: req.id, decision: "APPROVE" })}>
                          Approve
                        </Button>
                        <Button variant="danger" style={{ minHeight: "32px", padding: "0 10px", fontSize: "13px" }} onClick={() => decideTransfer.mutate({ id: req.id, decision: "REJECT" })}>
                          Reject
                        </Button>
                      </div>
                    );
                  }

                  if (isApproved && isNotAllocated) {
                    if (user?.role === "ADMIN" || user?.role === "ASSET_MANAGER") {
                      return (
                        <div className="actions">
                          <Button variant="primary" style={{ minHeight: "32px", padding: "0 10px", fontSize: "13px" }} onClick={() => decideTransfer.mutate({ id: req.id, decision: "APPROVE" })}>
                            Allocate Asset
                          </Button>
                          <Button variant="danger" style={{ minHeight: "32px", padding: "0 10px", fontSize: "13px" }} onClick={() => decideTransfer.mutate({ id: req.id, decision: "REJECT" })}>
                            Reject
                          </Button>
                        </div>
                      );
                    }
                    return <span className="muted" style={{ fontSize: "13px" }}>Approved by DH (Awaiting Allocation)</span>;
                  }

                  return <span className="muted" style={{ fontSize: "13px" }}>Processed</span>;
                } 
              }
            ]}
          />
        </Section>
      </section>
    </>
  );
}
