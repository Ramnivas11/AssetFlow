import { Plus, AlertTriangle, Calendar, FileText, ArrowRight } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { api, apiMessage, toastApiError, unwrap } from "../lib/api";
import { useList, useResource } from "../lib/queries";
import { labelize } from "../lib/status";
import { ActivityLog, Allocation, Role, Asset } from "../lib/types";
import { Button, ErrorState, RelativeTime, Skeleton, StatCard, StatusChip, SelectField, TextAreaField, DataTable } from "../ui/components";
import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "../state/auth";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export default function Dashboard({ role, navigate }: { role: Role; navigate: (path: string) => void }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  
  const query = useResource<any>("dashboard", "/dashboard", role !== "EMPLOYEE");
  const myAllocations = useList<Allocation>("my-allocations", "/allocations?activeOnly=true", role === "EMPLOYEE");
  const transfers = useList<any>("transfers", "/transfers", role === "EMPLOYEE");
  const maintenance = useList<any>("maintenance", "/maintenance", role === "EMPLOYEE");
  
  // Dialog Open States for Employee Workflow
  const [showNewAssetDialog, setShowNewAssetDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [showMaintenanceDialog, setShowMaintenanceDialog] = useState(false);
  
  // Dialog Form States
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [newAssetCategoryId, setNewAssetCategoryId] = useState("");
  const [newAssetId, setNewAssetId] = useState("");
  const [newAssetReason, setNewAssetReason] = useState("");
  const [transferTargetEmployeeId, setTransferTargetEmployeeId] = useState("");
  const [transferReason, setTransferReason] = useState("");
  const [returnReason, setReturnReason] = useState("");
  const [maintenanceIssue, setMaintenanceIssue] = useState("");
  const [maintenancePriority, setMaintenancePriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">("MEDIUM");

  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    // Entrance animations for stats and sections
    gsap.from(".stat-card", {
      opacity: 0,
      y: 12,
      duration: 0.35,
      stagger: 0.05,
      ease: "power2.out",
    });
    gsap.from("section.card", {
      opacity: 0,
      y: 16,
      duration: 0.45,
      stagger: 0.08,
      ease: "power2.out",
      delay: 0.1,
    });
  }, { scope: containerRef, dependencies: [query.isLoading, myAllocations.isLoading] });

  if (query.isLoading || myAllocations.isLoading || (role === "EMPLOYEE" && (transfers.isLoading || maintenance.isLoading))) return <Skeleton lines={5} />;
  if (query.isError && role !== "EMPLOYEE") return <ErrorState message={apiMessage(query.error)} onRetry={() => query.refetch()} />;

  const requestNewAssetMutation = useMutation({
    mutationFn: (body: any) => unwrap(api.post("/transfers", body)),
    onSuccess: () => {
      toast.success("New asset request submitted for approval");
      setShowNewAssetDialog(false);
      setNewAssetCategoryId("");
      setNewAssetId("");
      setNewAssetReason("");
      qc.invalidateQueries();
    },
    onError: toastApiError
  });

  const requestTransferMutation = useMutation({
    mutationFn: (body: any) => unwrap(api.post("/transfers", body)),
    onSuccess: () => {
      toast.success("Transfer request submitted for approval");
      setShowTransferDialog(false);
      setSelectedAsset(null);
      setTransferTargetEmployeeId("");
      setTransferReason("");
      qc.invalidateQueries();
    },
    onError: toastApiError
  });

  const requestReturnMutation = useMutation({
    mutationFn: (body: any) => unwrap(api.post("/transfers", body)),
    onSuccess: () => {
      toast.success("Return request submitted for approval");
      setShowReturnDialog(false);
      setSelectedAsset(null);
      setReturnReason("");
      qc.invalidateQueries();
    },
    onError: toastApiError
  });

  const raiseMaintenanceMutation = useMutation({
    mutationFn: (body: any) => unwrap(api.post("/maintenance", body)),
    onSuccess: () => {
      toast.success("Maintenance request raised successfully");
      setShowMaintenanceDialog(false);
      setSelectedAsset(null);
      setMaintenanceIssue("");
      setMaintenancePriority("MEDIUM");
      qc.invalidateQueries();
    },
    onError: toastApiError
  });

  const categories = useList<any>("categories", "/asset-categories", role === "EMPLOYEE");
  const allAssets = useList<any>("assets", "/assets", role === "EMPLOYEE");
  const employees = useList<any>("employees", "/employees", role === "EMPLOYEE");

  const availableAssets = allAssets.data?.filter((a: any) => a.status === "AVAILABLE" && (newAssetCategoryId ? a.categoryId === newAssetCategoryId : true)) || [];
  const otherEmployees = employees.data?.filter((emp: any) => emp.id !== user?.id) || [];

  const data = role === "EMPLOYEE" 
    ? { 
        availableAssets: 0,
        allocatedAssets: myAllocations.data?.length ?? 0, 
        activeBookings: 0, 
        pendingTransfers: 0, 
        pendingMaintenance: 0, 
        upcomingReturns: myAllocations.data ?? [], 
        overdueReturns: [],
        recentActivities: []
      } 
    : query.data;

  const quickActions = [
    ...(role === "EMPLOYEE" ? [{ label: "Request New Asset", onClick: () => setShowNewAssetDialog(true), primary: true }] : []),
    ...(role === "ADMIN" || role === "ASSET_MANAGER" ? [{ label: "Register Asset", path: "/assets", primary: true }] : []),
    { label: "Book Resource", path: "/booking", primary: false },
    ...(role === "ADMIN" || role === "ASSET_MANAGER" || role === "EMPLOYEE" ? [{ label: "Raise Request", path: "/maintenance", primary: false }] : []),
  ];

  const formatActivity = (item: ActivityLog) => {
    let meta: any = {};
    try {
      meta = typeof item.metadata === "string" ? JSON.parse(item.metadata) : (item.metadata || {});
    } catch {
      meta = {};
    }
    const assetName = meta.assetName || meta.name || item.entityType;
    const assetTag = meta.assetTag || item.entityId || "";
    const action = labelize(item.action);

    let detail = "";
    if (item.action === "ASSET_ALLOCATED") {
      detail = `allocated to ${meta.employeeId || meta.departmentId || "holder"}`;
    } else if (item.action === "ASSET_RETURNED") {
      detail = `returned in ${meta.conditionOnReturn || "GOOD"} condition`;
    } else if (item.action.startsWith("MAINTENANCE_")) {
      detail = `issue: ${meta.issue || "maintenance"}`;
    } else if (item.action.startsWith("BOOKING_")) {
      detail = `booked slot`;
    } else if (meta.details) {
      detail = meta.details;
    }

    return (
      <span style={{ fontSize: "14px", display: "flex", gap: "8px", alignItems: "center" }}>
        <strong>{assetName}</strong>
        {assetTag ? <span className="mono muted" style={{ fontSize: "12px", background: "var(--surface-sunken)", padding: "1px 5px", borderRadius: "4px" }}>{assetTag}</span> : null}
        <span style={{ color: "var(--ink-300)" }}>—</span>
        <span>{action}</span>
        {detail ? (
          <>
            <span style={{ color: "var(--ink-300)" }}>—</span>
            <span className="muted">{detail}</span>
          </>
        ) : null}
      </span>
    );
  };

  return (
    <div ref={containerRef}>
      {data?.overdueReturns?.length ? (
        <div className="alert danger" style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
          <AlertTriangle size={18} style={{ color: "var(--danger-dot)" }} />
          <span>{data.overdueReturns.length} assets overdue for return — flagged for follow-up</span>
        </div>
      ) : null}

      {role === "EMPLOYEE" ? (
        <div style={{ display: "grid", gap: "24px" }}>
          <div className="toolbar">
            <h1 className="page-title">Employee Portal</h1>
            <div className="actions">
              <Button variant="primary" onClick={() => setShowNewAssetDialog(true)}>
                <Plus size={16} /> Request New Asset
              </Button>
              <Button onClick={() => navigate("/booking")}>
                Book Resource
              </Button>
            </div>
          </div>

          <div className="grid cols-3" style={{ gap: "16px" }}>
            <StatCard label="Assigned Resources" value={myAllocations.data?.length ?? 0} />
            <StatCard label="Pending Asset Requests" value={transfers.data?.filter((t: any) => t.requestedById === user?.id && (t.status === "PENDING" || t.status === "APPROVED")).length ?? 0} />
            <StatCard label="Active Maintenance Tickets" value={maintenance.data?.filter((m: any) => m.requestedById === user?.id && m.status !== "RESOLVED").length ?? 0} />
          </div>

          <div className="grid cols-1" style={{ gap: "20px" }}>
            <section className="card grid" style={{ gap: "12px" }}>
              <h2 className="section-title" style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: "8px" }}>My Allocated Resources</h2>
              <DataTable
                data={myAllocations.data || []}
                empty="No resources allocated to you currently."
                columns={[
                  { header: "Asset Tag", cell: ({ row }) => <span className="mono">{row.original.asset?.assetTag}</span> },
                  { header: "Asset Name", cell: ({ row }) => <strong>{row.original.asset?.name}</strong> },
                  { header: "Condition", cell: ({ row }) => <StatusChip status={row.original.asset?.currentCondition} /> },
                  { header: "Assigned Date", cell: ({ row }) => new Date(row.original.allocatedAt).toLocaleDateString() },
                  { header: "Due Date", cell: ({ row }) => row.original.expectedReturnDate ? new Date(row.original.expectedReturnDate).toLocaleDateString() : "Permanent" },
                  {
                    header: "Actions",
                    cell: ({ row }) => (
                      <div className="actions" style={{ gap: "6px" }}>
                        <Button style={{ minHeight: "28px", padding: "0 8px", fontSize: "12px" }} onClick={() => { setSelectedAsset(row.original.asset || null); setShowTransferDialog(true); }}>
                          Transfer
                        </Button>
                        <Button style={{ minHeight: "28px", padding: "0 8px", fontSize: "12px" }} onClick={() => { setSelectedAsset(row.original.asset || null); setShowReturnDialog(true); }}>
                          Return
                        </Button>
                        <Button style={{ minHeight: "28px", padding: "0 8px", fontSize: "12px" }} onClick={() => { setSelectedAsset(row.original.asset || null); setShowMaintenanceDialog(true); }}>
                          Maintenance
                        </Button>
                      </div>
                    )
                  }
                ]}
              />
            </section>
          </div>

          <div className="grid cols-2" style={{ gap: "20px" }}>
            <section className="card grid" style={{ gap: "12px" }}>
              <h2 className="section-title" style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: "8px" }}>Asset & Transfer Requests</h2>
              <DataTable
                data={transfers.data?.filter((t: any) => t.requestedById === user?.id) || []}
                empty="No requests submitted."
                columns={[
                  { header: "Asset", cell: ({ row }) => <span>{row.original.asset?.name} ({row.original.asset?.assetTag})</span> },
                  { header: "Status", cell: ({ row }) => {
                    const req = row.original;
                    const displayStatus = req.status === "APPROVED" && req.asset?.status !== "ALLOCATED" ? "DH_APPROVED" : req.status;
                    return <StatusChip status={displayStatus} />;
                  }},
                  { header: "Type/Reason", cell: ({ row }) => <span style={{ fontSize: "13px" }} className="muted">{row.original.reason}</span> }
                ]}
              />
            </section>

            <section className="card grid" style={{ gap: "12px" }}>
              <h2 className="section-title" style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: "8px" }}>Maintenance Tickets</h2>
              <DataTable
                data={maintenance.data?.filter((m: any) => m.requestedById === user?.id) || []}
                empty="No maintenance tickets."
                columns={[
                  { header: "Asset", cell: ({ row }) => <span>{row.original.asset?.name}</span> },
                  { header: "Issue", accessorKey: "issue" },
                  { header: "Priority", cell: ({ row }) => <StatusChip status={row.original.priority} /> },
                  { header: "Status", cell: ({ row }) => <StatusChip status={row.original.status} /> }
                ]}
              />
            </section>
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
            <div>
              <h1 className="page-title">Good morning, {user?.name.split(" ")[0]}</h1>
              <p className="muted" style={{ fontSize: "15px", margin: "6px 0 0" }}>Here is your operational summary for today.</p>
            </div>
            <div className="actions">
              {quickActions.map((action: any) => (
                <Button key={action.label} variant={action.primary ? "primary" : undefined} onClick={action.onClick ? action.onClick : () => navigate(action.path || "")}>
                  {action.primary ? <Plus size={16} /> : null}
                  {action.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid cols-4" style={{ marginTop: "8px" }}>
            <StatCard label="Available Assets" value={data?.availableAssets ?? 0} />
            <StatCard label="Allocated Assets" value={data?.allocatedAssets ?? 0} />
            <StatCard 
              label={role === "DEPARTMENT_HEAD" ? "Active Bookings" : "Pending Maintenance"} 
              value={role === "DEPARTMENT_HEAD" ? data?.activeBookings ?? 0 : data?.pendingMaintenance ?? 0} 
            />
            <StatCard label="Pending Transfers" value={data?.pendingTransfers ?? 0} />
          </div>

          <div className="grid cols-2" style={{ marginTop: "16px" }}>
            <section className="card" style={{ display: "grid", gap: "12px" }}>
              <h2 className="section-title" style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: "8px" }}>Recent Activity</h2>
              <div style={{ display: "grid", gap: "10px" }}>
                {data?.recentActivities?.length ? (
                  data.recentActivities.map((item: ActivityLog) => (
                    <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      {formatActivity(item)}
                      <span style={{ fontSize: "12px" }} className="muted"><RelativeTime value={item.createdAt} /></span>
                    </div>
                  ))
                ) : (
                  <p className="muted" style={{ margin: 0, fontSize: "14px" }}>No recent activity yet.</p>
                )}
              </div>
            </section>

            <section className="card" style={{ display: "grid", gap: "12px" }}>
              <h2 className="section-title" style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: "8px" }}>Upcoming Returns</h2>
              <div style={{ display: "grid", gap: "10px" }}>
                {data?.upcomingReturns?.length ? (
                  data.upcomingReturns.map((item: Allocation) => (
                    <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px" }}>
                      <span>
                        <strong>{item.asset?.name}</strong> <span className="mono muted" style={{ fontSize: "12px", background: "var(--surface-sunken)", padding: "1px 5px", borderRadius: "4px" }}>{item.asset?.assetTag}</span>
                      </span>
                      <span className="muted" style={{ fontSize: "13px" }}>due {item.expectedReturnDate ? new Date(item.expectedReturnDate).toLocaleDateString() : "TBD"}</span>
                    </div>
                  ))
                ) : (
                  <p className="muted" style={{ margin: 0, fontSize: "14px" }}>No upcoming returns.</p>
                )}
              </div>
            </section>
          </div>

          <div className="grid cols-2" style={{ marginTop: "16px" }}>
            <section className="card" style={{ display: "grid", gap: "12px" }}>
              <h2 className="section-title" style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: "8px" }}>Department Summary</h2>
              <div style={{ display: "grid", gap: "10px" }}>
                {data?.departmentSummary?.length ? (
                  data.departmentSummary.map((dept: any) => (
                    <div key={dept.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px" }}>
                      <strong>{dept.name}</strong>
                      <span className="muted" style={{ fontSize: "13px" }}>{dept._count.assets} assets · {dept._count.employees} employees</span>
                    </div>
                  ))
                ) : (
                  <p className="muted" style={{ margin: 0, fontSize: "14px" }}>No department summary yet.</p>
                )}
              </div>
            </section>

            <section className="card" style={{ display: "grid", gap: "12px" }}>
              <h2 className="section-title" style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: "8px" }}>Booking Summary</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={[
                  { name: "Active Bookings", value: data?.activeBookings ?? 0 }, 
                  { name: "Pending Transfers", value: data?.pendingTransfers ?? 0 }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                  <XAxis dataKey="name" stroke="var(--ink-500)" fontSize={12} tickLine={false} />
                  <YAxis stroke="var(--ink-500)" fontSize={12} tickLine={false} />
                  <Tooltip cursor={{ fill: "var(--surface-sunken)" }} />
                  <Bar dataKey="value" fill="var(--signal-500)" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </section>
          </div>
        </>
      )}

      {/* Request New Asset Dialog */}
      {showNewAssetDialog ? (
        <>
          <button className="drawer-backdrop" onClick={() => setShowNewAssetDialog(false)} />
          <div className="drawer" style={{ left: "50%", right: "auto", top: "10%", height: "auto", maxHeight: "80vh", transform: "translateX(-50%)", width: "100%", maxWidth: "580px", borderRadius: "var(--rounded-lg)", border: "1px solid var(--border)" }}>
            <div className="drawer-header">
              <h2 className="section-title">Request New Asset</h2>
              <Button style={{ minHeight: "32px", padding: "0 10px" }} onClick={() => setShowNewAssetDialog(false)}>Cancel</Button>
            </div>
            <div style={{ padding: "16px", display: "grid", gap: "16px" }}>
              <SelectField label="Asset Category" value={newAssetCategoryId} onChange={(e) => { setNewAssetCategoryId(e.target.value); setNewAssetId(""); }}>
                <option value="">Select Category</option>
                {categories.data?.map((cat: any) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </SelectField>
              
              <SelectField label="Select Available Asset" value={newAssetId} onChange={(e) => setNewAssetId(e.target.value)} disabled={!newAssetCategoryId}>
                <option value="">Choose Asset</option>
                {availableAssets.map((a: any) => (
                  <option key={a.id} value={a.id}>{a.name} ({a.assetTag})</option>
                ))}
              </SelectField>

              <TextAreaField 
                label="Reason for Request" 
                value={newAssetReason} 
                onChange={(e) => setNewAssetReason(e.target.value)} 
                placeholder="Why do you need this asset?"
              />

              <Button 
                variant="primary" 
                disabled={!newAssetId || !newAssetReason.trim()}
                onClick={() => {
                  requestNewAssetMutation.mutate({
                    assetId: newAssetId,
                    targetEmployeeId: user?.id,
                    reason: "NEW ASSET REQUEST: " + newAssetReason
                  });
                }}
              >
                Submit Request
              </Button>
            </div>
          </div>
        </>
      ) : null}

      {/* Request Transfer Dialog */}
      {showTransferDialog && selectedAsset ? (
        <>
          <button className="drawer-backdrop" onClick={() => { setShowTransferDialog(false); setSelectedAsset(null); }} />
          <div className="drawer" style={{ left: "50%", right: "auto", top: "10%", height: "auto", maxHeight: "80vh", transform: "translateX(-50%)", width: "100%", maxWidth: "580px", borderRadius: "var(--rounded-lg)", border: "1px solid var(--border)" }}>
            <div className="drawer-header">
              <div>
                <h2 className="section-title">Request Transfer</h2>
                <p className="muted" style={{ fontSize: "12px", margin: "2px 0 0" }}>Transfer {selectedAsset.name} ({selectedAsset.assetTag}) to another colleague</p>
              </div>
              <Button style={{ minHeight: "32px", padding: "0 10px" }} onClick={() => { setShowTransferDialog(false); setSelectedAsset(null); }}>Cancel</Button>
            </div>
            <div style={{ padding: "16px", display: "grid", gap: "16px" }}>
              <SelectField label="Transfer Target Colleague" value={transferTargetEmployeeId} onChange={(e) => setTransferTargetEmployeeId(e.target.value)}>
                <option value="">Select Colleague</option>
                {otherEmployees.map((emp: any) => (
                  <option key={emp.id} value={emp.id}>{emp.name} ({emp.email})</option>
                ))}
              </SelectField>

              <TextAreaField 
                label="Reason for Transfer" 
                value={transferReason} 
                onChange={(e) => setTransferReason(e.target.value)} 
                placeholder="Why are you transferring this asset?"
              />

              <Button 
                variant="primary" 
                disabled={!transferTargetEmployeeId || !transferReason.trim()}
                onClick={() => {
                  requestTransferMutation.mutate({
                    assetId: selectedAsset.id,
                    targetEmployeeId: transferTargetEmployeeId,
                    reason: "TRANSFER REQUEST: " + transferReason
                  });
                }}
              >
                Submit Request
              </Button>
            </div>
          </div>
        </>
      ) : null}

      {/* Request Return Dialog */}
      {showReturnDialog && selectedAsset ? (
        <>
          <button className="drawer-backdrop" onClick={() => { setShowReturnDialog(false); setSelectedAsset(null); }} />
          <div className="drawer" style={{ left: "50%", right: "auto", top: "10%", height: "auto", maxHeight: "80vh", transform: "translateX(-50%)", width: "100%", maxWidth: "580px", borderRadius: "var(--rounded-lg)", border: "1px solid var(--border)" }}>
            <div className="drawer-header">
              <div>
                <h2 className="section-title">Request Return Check-In</h2>
                <p className="muted" style={{ fontSize: "12px", margin: "2px 0 0" }}>Return {selectedAsset.name} ({selectedAsset.assetTag}) back to the department pool</p>
              </div>
              <Button style={{ minHeight: "32px", padding: "0 10px" }} onClick={() => { setShowReturnDialog(false); setSelectedAsset(null); }}>Cancel</Button>
            </div>
            <div style={{ padding: "16px", display: "grid", gap: "16px" }}>
              <TextAreaField 
                label="Reason/Notes for Return" 
                value={returnReason} 
                onChange={(e) => setReturnReason(e.target.value)} 
                placeholder="Notes on asset condition or reason for return..."
              />

              <Button 
                variant="primary" 
                disabled={!returnReason.trim()}
                onClick={() => {
                  requestReturnMutation.mutate({
                    assetId: selectedAsset.id,
                    targetDepartmentId: user?.departmentId,
                    reason: "RETURN REQUEST: " + returnReason
                  });
                }}
              >
                Submit Return Request
              </Button>
            </div>
          </div>
        </>
      ) : null}

      {/* Raise Maintenance Dialog */}
      {showMaintenanceDialog && selectedAsset ? (
        <>
          <button className="drawer-backdrop" onClick={() => { setShowMaintenanceDialog(false); setSelectedAsset(null); }} />
          <div className="drawer" style={{ left: "50%", right: "auto", top: "10%", height: "auto", maxHeight: "80vh", transform: "translateX(-50%)", width: "100%", maxWidth: "580px", borderRadius: "var(--rounded-lg)", border: "1px solid var(--border)" }}>
            <div className="drawer-header">
              <div>
                <h2 className="section-title">Raise Maintenance Ticket</h2>
                <p className="muted" style={{ fontSize: "12px", margin: "2px 0 0" }}>Report an issue with {selectedAsset.name} ({selectedAsset.assetTag})</p>
              </div>
              <Button style={{ minHeight: "32px", padding: "0 10px" }} onClick={() => { setShowMaintenanceDialog(false); setSelectedAsset(null); }}>Cancel</Button>
            </div>
            <div style={{ padding: "16px", display: "grid", gap: "16px" }}>
              <SelectField label="Priority" value={maintenancePriority} onChange={(e) => setMaintenancePriority(e.target.value as any)}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </SelectField>

              <TextAreaField 
                label="Describe the Issue" 
                value={maintenanceIssue} 
                onChange={(e) => setMaintenanceIssue(e.target.value)} 
                placeholder="Please describe what is wrong with the asset..."
              />

              <Button 
                variant="primary" 
                disabled={!maintenanceIssue.trim()}
                onClick={() => {
                  raiseMaintenanceMutation.mutate({
                    assetId: selectedAsset.id,
                    issue: maintenanceIssue,
                    priority: maintenancePriority,
                    conditionBefore: selectedAsset.currentCondition || "GOOD"
                  });
                }}
              >
                Submit Ticket
              </Button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
