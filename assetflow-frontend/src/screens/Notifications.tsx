import { useState, useMemo } from "react";
import { useAuth } from "../state/auth";
import { useList } from "../lib/queries";
import { ActivityLog, NotificationItem } from "../lib/types";
import { DataTable, EmptyState, RelativeTime, Section, StatusChip, Button } from "../ui/components";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, unwrap } from "../lib/api";
import { toast } from "sonner";
import { Check, ClipboardList, BellRing } from "lucide-react";
import { labelize } from "../lib/status";

export default function Notifications() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState("All");
  
  const notifications = useList<NotificationItem>("notifications", "/notifications");
  const canViewAuditTrail = user?.role === "ADMIN" || user?.role === "ASSET_MANAGER";
  const logs = useList<ActivityLog>("activity-logs", "/activity-logs", canViewAuditTrail);

  const markRead = useMutation({
    mutationFn: (id: string) => unwrap(api.patch(`/notifications/${id}/read`)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    }
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const unread = notifications.data?.filter(n => !n.read) || [];
      await Promise.all(unread.map(n => api.patch(`/notifications/${n.id}/read`)));
    },
    onSuccess: () => {
      toast.success("All notifications marked as read");
      qc.invalidateQueries({ queryKey: ["notifications"] });
    }
  });

  const filtered = useMemo(() => {
    if (!notifications.data) return [];
    return notifications.data.filter((item) => {
      if (tab === "All") return true;
      if (tab === "Alerts") return item.type === "ALERT" || item.type === "WARNING";
      if (tab === "Approvals") return item.type === "TASK_ASSIGNED" || item.message.toLowerCase().includes("approve") || item.message.toLowerCase().includes("transfer");
      if (tab === "Bookings") return item.message.toLowerCase().includes("booking");
      return true;
    });
  }, [notifications.data, tab]);

  const unreadCount = notifications.data?.filter(n => !n.read).length ?? 0;

  return (
    <>
      <div className="toolbar">
        <h1 className="page-title">Notifications</h1>
        {unreadCount > 0 ? (
          <Button onClick={() => markAllRead.mutate()} style={{ minHeight: "36px" }}>
            <Check size={16} /> Mark all read
          </Button>
        ) : null}
      </div>

      <div className="tabs" style={{ marginBottom: "16px" }}>
        {["All", "Alerts", "Approvals", "Bookings"].map((item) => (
          <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>
            {item}
          </button>
        ))}
      </div>

      <Section query={notifications}>
        <div className="grid" style={{ gap: "10px" }}>
          {filtered?.length ? (
            filtered.map((item) => (
              <article 
                className="card" 
                key={item.id} 
                style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center", 
                  padding: "12px 16px",
                  borderLeft: !item.read ? "3px solid var(--signal-500)" : "1px solid var(--border)",
                  background: !item.read ? "var(--surface)" : "var(--surface-sunken)"
                }}
              >
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  {!item.read ? (
                    <span 
                      style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--signal-500)", display: "inline-block" }}
                      title="Unread"
                    />
                  ) : null}
                  <span style={{ fontSize: "14px" }}>
                    {item.message} <span style={{ color: "var(--ink-300)", margin: "0 6px" }}>—</span> 
                    <span className="muted" style={{ fontSize: "12px" }}><RelativeTime value={item.createdAt} /></span>
                  </span>
                </div>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <StatusChip status={item.type} />
                  {!item.read ? (
                    <button 
                      onClick={() => markRead.mutate(item.id)}
                      style={{ border: 0, background: "none", color: "var(--signal-500)", padding: 0, minHeight: "unset", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}
                    >
                      Mark read
                    </button>
                  ) : null}
                </div>
              </article>
            ))
          ) : (
            <EmptyState title="No notifications in this filter">
              New assignments, approvals, booking changes, and alerts will appear here.
            </EmptyState>
          )}
        </div>
      </Section>

      {/* Visually Separated Admin Audit Trail */}
      {canViewAuditTrail ? (
        <section style={{ marginTop: "32px", borderTop: "1px solid var(--border)", paddingTop: "24px" }} className="grid">
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--ink-700)" }}>
            <ClipboardList size={20} />
            <h2 className="section-title">System-Wide Audit Trail</h2>
          </div>
          <p className="muted" style={{ margin: "0 0 12px", fontSize: "13px" }}>
            Complete audit logs of system actions with absolute timestamps, accessible to administrators and asset managers.
          </p>

          <Section query={logs}>
            <DataTable
              data={logs.data}
              empty="No activity logs in system trail."
              columns={[
                { 
                  header: "Event", 
                  cell: ({ row }) => (
                    <div>
                      <strong>{labelize(row.original.action)}</strong>
                      <div className="muted" style={{ fontSize: "12px", marginTop: "2px" }}>By User: {row.original.user?.name ?? "System"}</div>
                    </div>
                  ) 
                },
                { 
                  header: "Target Entity", 
                  cell: ({ row }) => (
                    <div>
                      <span>{row.original.entityType}</span>
                      {row.original.entityId ? <span className="mono muted" style={{ fontSize: "11px", marginLeft: "6px" }}>({row.original.entityId})</span> : null}
                    </div>
                  ) 
                },
                { header: "Timestamp", cell: ({ row }) => new Date(row.original.createdAt).toLocaleString() }
              ]}
            />
          </Section>
        </section>
      ) : null}
    </>
  );
}
