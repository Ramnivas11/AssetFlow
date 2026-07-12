import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, unwrap, toastApiError } from "../lib/api";
import { useList } from "../lib/queries";
import { labelize } from "../lib/status";
import { MaintenanceRequest, Asset, User } from "../lib/types";
import { Button, KanbanBoard, Section, StatusChip, TextField, SelectField, TextAreaField, EntityDrawer } from "../ui/components";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Play, Check, ShieldCheck, UserPlus, XCircle, Info } from "lucide-react";

export default function Maintenance() {
  const qc = useQueryClient();
  const requests = useList<MaintenanceRequest>("maintenance", "/maintenance");
  const assets = useList<Asset>("assets", "/assets");
  const employees = useList<User>("employees", "/employees");

  // Form & Dialog states
  const [showRaiseDialog, setShowRaiseDialog] = useState(false);
  const [raiseAssetId, setRaiseAssetId] = useState("");
  const [raiseIssue, setRaiseIssue] = useState("");
  const [raisePriority, setRaisePriority] = useState("MEDIUM");
  const [raiseCondition, setRaiseCondition] = useState("GOOD");

  // Assign Technician State
  const [assigningCardId, setAssigningCardId] = useState<string | null>(null);
  const [technicianId, setTechnicianId] = useState("");

  // Resolve State
  const [resolvingCardId, setResolvingCardId] = useState<string | null>(null);
  const [resolution, setResolution] = useState("");
  const [conditionAfter, setConditionAfter] = useState("GOOD");

  // Detail Drawer State
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);

  const create = useMutation({
    mutationFn: (body: any) => unwrap(api.post("/maintenance", body)),
    onSuccess: () => {
      toast.success("Maintenance request raised successfully");
      setShowRaiseDialog(false);
      setRaiseAssetId("");
      setRaiseIssue("");
      qc.invalidateQueries({ queryKey: ["maintenance"] });
    },
    onError: toastApiError
  });

  const decide = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => unwrap(api.patch(`/maintenance/${id}/decision`, body)),
    onSuccess: () => {
      toast.success("Maintenance decision recorded");
      setAssigningCardId(null);
      qc.invalidateQueries({ queryKey: ["maintenance"] });
    },
    onError: toastApiError
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => unwrap(api.patch(`/maintenance/${id}/status`, body)),
    onSuccess: () => {
      toast.success("Maintenance status updated");
      setResolvingCardId(null);
      setResolution("");
      qc.invalidateQueries({ queryKey: ["maintenance"] });
    },
    onError: toastApiError
  });

  const columns = ["PENDING", "APPROVED", "TECHNICIAN_ASSIGNED", "IN_PROGRESS", "RESOLVED"].map((status) => ({
    title: labelize(status),
    tone: status === "RESOLVED" ? "success" as const : undefined,
    items: (requests.data ?? []).filter((item) => {
      if (status === "TECHNICIAN_ASSIGNED") {
        return item.status === "APPROVED" && item.technicianId;
      }
      if (status === "APPROVED") {
        return item.status === "APPROVED" && !item.technicianId;
      }
      return item.status === status;
    }),
  }));

  const handleApprove = (id: string) => {
    decide.mutate({ id, body: { decision: "APPROVE" } });
  };

  const handleReject = (id: string) => {
    decide.mutate({ id, body: { decision: "REJECT" } });
  };

  const handleAssignTechnician = (id: string) => {
    decide.mutate({ id, body: { decision: "APPROVE", technicianId } });
  };

  return (
    <>
      <div className="toolbar">
        <h1 className="page-title">Maintenance Management</h1>
        <Button variant="primary" onClick={() => setShowRaiseDialog(true)}>
          Raise Request
        </Button>
      </div>

      <div className="alert info" style={{ fontSize: "14px" }}>
        <strong>System Rule:</strong> Approving a card moves the asset to <strong>Under Maintenance</strong>; resolving returns it to <strong>Available</strong>.
      </div>

      {/* Raise Request Dialog */}
      {showRaiseDialog ? (
        <>
          <button className="drawer-backdrop" onClick={() => setShowRaiseDialog(false)} />
          <div className="drawer" style={{ left: "50%", right: "auto", top: "10%", height: "auto", transform: "translateX(-50%)", width: "100%", maxWidth: "500px", borderRadius: "var(--rounded-lg)", border: "1px solid var(--border)", padding: "20px" }}>
            <div className="drawer-header">
              <h2 className="section-title">Raise Maintenance Request</h2>
              <Button style={{ minHeight: "32px", padding: "0 10px" }} onClick={() => setShowRaiseDialog(false)}>Cancel</Button>
            </div>
            <div className="grid" style={{ gap: "12px", marginTop: "12px" }}>
              <SelectField label="Asset" value={raiseAssetId} onChange={(e) => setRaiseAssetId(e.target.value)}>
                <option value="">Select Asset...</option>
                {assets.data?.map((asset) => (
                  <option key={asset.id} value={asset.id}>{asset.assetTag} — {asset.name}</option>
                ))}
              </SelectField>

              <TextAreaField 
                label="Issue Summary" 
                value={raiseIssue} 
                onChange={(e) => setRaiseIssue(e.target.value)} 
                placeholder="What seems to be the problem?"
              />

              <SelectField label="Priority" value={raisePriority} onChange={(e) => setRaisePriority(e.target.value)}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </SelectField>

              <SelectField label="Current Asset Condition" value={raiseCondition} onChange={(e) => setRaiseCondition(e.target.value)}>
                <option value="GOOD">Good</option>
                <option value="EXCELLENT">Excellent</option>
                <option value="FAIR">Fair</option>
                <option value="POOR">Poor</option>
                <option value="DAMAGED">Damaged</option>
              </SelectField>

              <Button 
                variant="primary" 
                style={{ marginTop: "8px" }} 
                onClick={() => create.mutate({
                  assetId: raiseAssetId,
                  issue: raiseIssue,
                  priority: raisePriority,
                  conditionBefore: raiseCondition
                })}
                disabled={!raiseAssetId || !raiseIssue}
              >
                Submit Request
              </Button>
            </div>
          </div>
        </>
      ) : null}

      {/* Assign Technician Dialog */}
      {assigningCardId ? (
        <>
          <button className="drawer-backdrop" onClick={() => setAssigningCardId(null)} />
          <div className="drawer" style={{ left: "50%", right: "auto", top: "25%", height: "auto", transform: "translateX(-50%)", width: "100%", maxWidth: "400px", borderRadius: "var(--rounded-lg)", border: "1px solid var(--border)", padding: "20px" }}>
            <h3 className="section-title">Assign Technician</h3>
            <div className="grid" style={{ gap: "12px", marginTop: "12px" }}>
              <SelectField label="Technician" value={technicianId} onChange={(e) => setTechnicianId(e.target.value)}>
                <option value="">Select Technician...</option>
                {employees.data?.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
                ))}
              </SelectField>
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "8px" }}>
                <Button onClick={() => setAssigningCardId(null)}>Cancel</Button>
                <Button variant="primary" onClick={() => handleAssignTechnician(assigningCardId)} disabled={!technicianId}>Assign</Button>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {/* Resolve Dialog */}
      {resolvingCardId ? (
        <>
          <button className="drawer-backdrop" onClick={() => setResolvingCardId(null)} />
          <div className="drawer" style={{ left: "50%", right: "auto", top: "15%", height: "auto", transform: "translateX(-50%)", width: "100%", maxWidth: "450px", borderRadius: "var(--rounded-lg)", border: "1px solid var(--border)", padding: "20px" }}>
            <h3 className="section-title">Resolve Maintenance</h3>
            <div className="grid" style={{ gap: "12px", marginTop: "12px" }}>
              <TextAreaField 
                label="Resolution Notes" 
                value={resolution} 
                onChange={(e) => setResolution(e.target.value)} 
                placeholder="Describe how the issue was fixed..."
              />
              <SelectField label="Condition After Service" value={conditionAfter} onChange={(e) => setConditionAfter(e.target.value)}>
                <option value="EXCELLENT">Excellent</option>
                <option value="GOOD">Good</option>
                <option value="FAIR">Fair</option>
                <option value="POOR">Poor</option>
                <option value="DAMAGED">Damaged</option>
              </SelectField>
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "8px" }}>
                <Button onClick={() => setResolvingCardId(null)}>Cancel</Button>
                <Button variant="primary" onClick={() => updateStatus.mutate({
                  id: resolvingCardId,
                  body: {
                    status: "RESOLVED",
                    resolution,
                    conditionAfter
                  }
                })} disabled={!resolution}>Resolve Request</Button>
              </div>
            </div>
          </div>
        </>
      ) : null}

      <Section query={requests}>
        <KanbanBoard
          columns={columns}
          renderCard={(item) => {
            const isResolved = item.status === "RESOLVED";
            return (
              <article 
                className={`kanban-card ${isResolved ? "resolved-card" : ""}`} 
                key={item.id}
                style={{ cursor: "pointer" }}
                onClick={() => setSelectedRequest(item)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                  <span className="mono" style={{ fontSize: "12px", background: "var(--surface-sunken)", padding: "2px 6px", borderRadius: "4px", fontWeight: 600 }}>
                    {item.asset?.assetTag ?? item.assetId}
                  </span>
                  <StatusChip status={item.priority} />
                </div>
                
                <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>{item.asset?.name ?? "Asset"}</h4>
                <p style={{ margin: 0, fontSize: "13px" }} className="muted">{item.issue}</p>
                
                {item.technician ? (
                  <p className="muted" style={{ margin: 0, fontSize: "12px", display: "flex", gap: "4px", alignItems: "center" }}>
                    <span>🔧 techn:</span>
                    <strong>{item.technician.name}</strong>
                  </p>
                ) : null}

                {/* Explicit Action Buttons to advance status */}
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", borderTop: "1px solid var(--border-subtle)", paddingTop: "8px", marginTop: "4px" }} onClick={(e) => e.stopPropagation()}>
                  {item.status === "PENDING" ? (
                    <>
                      <Button style={{ minHeight: "28px", padding: "0 8px", fontSize: "12px" }} onClick={() => handleApprove(item.id)}>
                        <Check size={12} /> Approve
                      </Button>
                      <Button variant="danger" style={{ minHeight: "28px", padding: "0 8px", fontSize: "12px" }} onClick={() => handleReject(item.id)}>
                        <XCircle size={12} /> Reject
                      </Button>
                    </>
                  ) : null}

                  {item.status === "APPROVED" && !item.technicianId ? (
                    <Button style={{ minHeight: "28px", padding: "0 8px", fontSize: "12px" }} onClick={() => setAssigningCardId(item.id)}>
                      <UserPlus size={12} /> Assign Tech
                    </Button>
                  ) : null}

                  {item.status === "APPROVED" && item.technicianId ? (
                    <Button style={{ minHeight: "28px", padding: "0 8px", fontSize: "12px" }} onClick={() => updateStatus.mutate({ id: item.id, body: { status: "IN_PROGRESS" } })}>
                      <Play size={12} /> Start Work
                    </Button>
                  ) : null}

                  {item.status === "IN_PROGRESS" ? (
                    <Button style={{ minHeight: "28px", padding: "0 8px", fontSize: "12px", background: "var(--success-bg)", color: "var(--success-text)", borderColor: "transparent" }} onClick={() => setResolvingCardId(item.id)}>
                      <ShieldCheck size={12} /> Resolve
                    </Button>
                  ) : null}
                </div>
              </article>
            );
          }}
        />
      </Section>

      <EntityDrawer
        open={Boolean(selectedRequest)}
        title="Maintenance Request Details"
        subtitle={selectedRequest?.asset?.assetTag}
        onClose={() => setSelectedRequest(null)}
        tabs={[
          {
            label: "Details",
            content: selectedRequest ? (
              <div className="grid" style={{ gap: "16px", paddingTop: "12px" }}>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <StatusChip status={selectedRequest.status} />
                  <StatusChip status={selectedRequest.priority} />
                </div>
                
                <div className="card grid cols-2" style={{ gap: "12px" }}>
                  <div>
                    <label className="muted" style={{ fontSize: "12px" }}>Asset Name</label>
                    <p style={{ margin: "2px 0 0", fontWeight: 600 }}>{selectedRequest.asset?.name}</p>
                  </div>
                  <div>
                    <label className="muted" style={{ fontSize: "12px" }}>Asset Tag</label>
                    <p className="mono" style={{ margin: "2px 0 0", fontWeight: 600 }}>{selectedRequest.asset?.assetTag}</p>
                  </div>
                  <div>
                    <label className="muted" style={{ fontSize: "12px" }}>Condition Before</label>
                    <p style={{ margin: "2px 0 0", fontWeight: 600 }}>{selectedRequest.conditionBefore || "N/A"}</p>
                  </div>
                  <div>
                    <label className="muted" style={{ fontSize: "12px" }}>Condition After</label>
                    <p style={{ margin: "2px 0 0", fontWeight: 600 }}>{selectedRequest.conditionAfter || "Pending"}</p>
                  </div>
                </div>

                <div className="card grid" style={{ gap: "6px" }}>
                  <label className="muted" style={{ fontSize: "12px" }}>Issue Description</label>
                  <p style={{ margin: 0, fontSize: "14px", lineHeight: 1.4 }}>{selectedRequest.issue}</p>
                </div>

                {selectedRequest.resolution ? (
                  <div className="card grid" style={{ gap: "6px", background: "var(--success-bg)", borderColor: "var(--success-dot)" }}>
                    <label className="success-text" style={{ fontSize: "12px", fontWeight: 600 }}>Resolution Notes</label>
                    <p style={{ margin: 0, fontSize: "14px", color: "var(--success-text)", lineHeight: 1.4 }}>{selectedRequest.resolution}</p>
                  </div>
                ) : null}
              </div>
            ) : null
          }
        ]}
      />

      {/* Footer Rule visibility */}
      <footer style={{ marginTop: "32px", display: "flex", gap: "8px", alignItems: "center", borderTop: "1px solid var(--border)", paddingTop: "16px" }} className="muted">
        <Info size={16} />
        <span style={{ fontSize: "13px" }}>Kanban rule: Approving moves the asset to Under Maintenance; resolving returns it to Available.</span>
      </footer>
    </>
  );
}
