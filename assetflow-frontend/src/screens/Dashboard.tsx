import {
  AlertTriangle,
  ArrowRight,
  Box,
  CheckCircle2,
  Clock,
  PackageCheck,
  Plus,
  RotateCcw,
  TrendingUp,
  Wrench,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { api, apiMessage, toastApiError, unwrap } from "../lib/api";
import { useList, useResource } from "../lib/queries";
import { labelize } from "../lib/status";
import { ActivityLog, Allocation, Asset, Role } from "../lib/types";
import {
  Button,
  DataTable,
  ErrorState,
  RelativeTime,
  Skeleton,
  StatCard,
  StatusChip,
  SelectField,
  TextAreaField,
} from "../ui/components";
import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "../state/auth";

// ─── Inline modal component ──────────────────────────────────────────────────
const Modal = ({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) => (
  <>
    <button
      className="drawer-backdrop"
      onClick={onClose}
      aria-label="Close modal"
    />
    <div
      className="drawer"
      style={{
        left: "50%",
        right: "auto",
        top: "8%",
        height: "auto",
        maxHeight: "84vh",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: 560,
        borderRadius: "var(--rounded-lg)",
        border: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div className="drawer-header">
        <div>
          <h2 className="section-title">{title}</h2>
          {subtitle && (
            <p className="muted" style={{ fontSize: 13, margin: "4px 0 0" }}>
              {subtitle}
            </p>
          )}
        </div>
        <Button onClick={onClose} style={{ minHeight: 32, padding: "0 10px" }}>
          <X size={16} />
        </Button>
      </div>
      <div
        style={{ padding: 20, display: "grid", gap: 16, overflowY: "auto" }}
      >
        {children}
      </div>
    </div>
  </>
);

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard({
  role,
  navigate,
}: {
  role: Role;
  navigate: (path: string) => void;
}) {
  const qc = useQueryClient();
  const { user } = useAuth();

  // Data queries
  const isManager = role !== "EMPLOYEE";
  const query = useResource<any>("dashboard", "/dashboard", isManager);
  const myAllocations = useList<Allocation>(
    "my-allocations",
    "/allocations?activeOnly=true",
    role === "EMPLOYEE"
  );
  const allAssets = useList<Asset>("assets", "/assets?limit=1000", true);
  const transfers = useList<any>("transfers", "/transfers", true);
  const maintenance = useList<any>("maintenance", "/maintenance?limit=100", true);
  const categories = useList<any>("categories", "/asset-categories?limit=1000", true);
  const employees = useList<any>("employees", "/employees?limit=1000", role !== "EMPLOYEE");

  // Dialog state
  const [modal, setModal] = useState<
    null | "newAsset" | "transfer" | "return" | "maintenance"
  >(null);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  // Form state
  const [newAssetCategoryId, setNewAssetCategoryId] = useState("");
  const [newAssetId, setNewAssetId] = useState("");
  const [newAssetReason, setNewAssetReason] = useState("");
  const [transferTargetId, setTransferTargetId] = useState("");
  const [transferReason, setTransferReason] = useState("");
  const [returnReason, setReturnReason] = useState("");
  const [maintenanceIssue, setMaintenanceIssue] = useState("");
  const [maintenancePriority, setMaintenancePriority] = useState<
    "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  >("MEDIUM");

  const containerRef = useRef<HTMLDivElement>(null);

  // ── Loading / Error ──
  const isLoading =
    (isManager && query.isLoading) ||
    (role === "EMPLOYEE" &&
      (myAllocations.isLoading ||
        transfers.isLoading ||
        maintenance.isLoading));


  // ── Mutations ──
  const requestNewAsset = useMutation({
    mutationFn: (body: any) => unwrap(api.post("/transfers", body)),
    onSuccess: () => {
      toast.success("Asset request submitted");
      setModal(null);
      setNewAssetCategoryId("");
      setNewAssetId("");
      setNewAssetReason("");
      qc.invalidateQueries();
    },
    onError: toastApiError,
  });

  const requestTransfer = useMutation({
    mutationFn: (body: any) => unwrap(api.post("/transfers", body)),
    onSuccess: () => {
      toast.success("Transfer request submitted");
      setModal(null);
      setSelectedAsset(null);
      setTransferTargetId("");
      setTransferReason("");
      qc.invalidateQueries();
    },
    onError: toastApiError,
  });

  const requestReturn = useMutation({
    mutationFn: (body: any) => unwrap(api.post("/transfers", body)),
    onSuccess: () => {
      toast.success("Return request submitted");
      setModal(null);
      setSelectedAsset(null);
      setReturnReason("");
      qc.invalidateQueries();
    },
    onError: toastApiError,
  });

  const raiseMaintenance = useMutation({
    mutationFn: (body: any) => unwrap(api.post("/maintenance", body)),
    onSuccess: () => {
      toast.success("Maintenance ticket raised");
      setModal(null);
      setSelectedAsset(null);
      setMaintenanceIssue("");
      setMaintenancePriority("MEDIUM");
      qc.invalidateQueries();
    },
    onError: toastApiError,
  });

  if (isLoading) return <Skeleton lines={6} />;
  if (query.isError && isManager)
    return (
      <ErrorState
        message={apiMessage(query.error)}
        onRetry={() => query.refetch()}
      />
    );

  // ── Derived data ──
  const dashData = query.data;
  const availableAssets =
    allAssets.data?.filter(
      (a) =>
        a.status === "AVAILABLE" &&
        (newAssetCategoryId ? a.categoryId === newAssetCategoryId : true)
    ) ?? [];
  const otherEmployees =
    employees.data?.filter((e: any) => e.id !== user?.id) ?? [];
  const myPendingTransfers =
    transfers.data?.filter(
      (t: any) =>
        t.requestedById === user?.id &&
        (t.status === "PENDING" || t.status === "APPROVED")
    ) ?? [];
  const myActiveTickets =
    maintenance.data?.filter(
      (m: any) =>
        m.requestedById === user?.id &&
        m.status !== "RESOLVED" &&
        m.status !== "CANCELLED"
    ) ?? [];

  const openModal = (
    type: "newAsset" | "transfer" | "return" | "maintenance",
    asset?: Asset
  ) => {
    setSelectedAsset(asset ?? null);
    setModal(type);
  };

  const closeModal = () => {
    setModal(null);
    setSelectedAsset(null);
  };

  // ── Chart data ──
  const chartData = [
    { name: "Available", value: dashData?.availableAssets ?? 0 },
    { name: "Allocated", value: dashData?.allocatedAssets ?? 0 },
    { name: "Maintenance", value: dashData?.pendingMaintenance ?? 0 },
    { name: "Transfers", value: dashData?.pendingTransfers ?? 0 },
    { name: "Bookings", value: dashData?.activeBookings ?? 0 },
  ];

  // ── Employee View ─────────────────────────────────────────────────────────
  if (role === "EMPLOYEE") {
    return (
      <div ref={containerRef} className="flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="page-title">My Workspace</h1>
            <p className="text-sm text-ink-muted mt-1">
              Welcome back, {user?.name.split(" ")[0]} — here's your asset
              summary.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="primary" onClick={() => openModal("newAsset")}>
              <Plus size={16} /> Request Asset
            </Button>
            <Button onClick={() => navigate("/booking")}>Book Resource</Button>
            <Button onClick={() => navigate("/maintenance")}>
              <Wrench size={15} /> Raise Ticket
            </Button>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            label="Assets Assigned to Me"
            value={myAllocations.data?.length ?? 0}
            icon={Box}
            tint="indigo"
            detail={
              <span className="text-xs text-ink-muted">
                Active allocations
              </span>
            }
          />
          <StatCard
            label="Pending Requests"
            value={myPendingTransfers.length}
            icon={Clock}
            tint="amber"
            detail={
              <span className="text-xs text-ink-muted">
                Awaiting approval
              </span>
            }
          />
          <StatCard
            label="Open Maintenance Tickets"
            value={myActiveTickets.length}
            icon={Wrench}
            tint="rose"
            detail={
              <span className="text-xs text-ink-muted">
                In progress or pending
              </span>
            }
          />
        </div>

        {/* My Allocated Assets */}
        <section className="card flex flex-col gap-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium m-0 flex items-center gap-2">
              <Box size={18} />
              My Assigned Assets
            </h2>
            <span className="text-sm text-ink-muted">
              {myAllocations.data?.length ?? 0} assets
            </span>
          </div>
          <DataTable
            data={myAllocations.data ?? []}
            empty="No assets assigned to you yet."
            columns={[
              {
                header: "Asset Tag",
                cell: ({ row }) => (
                  <span className="font-mono text-xs">
                    {row.original.asset?.assetTag}
                  </span>
                ),
              },
              {
                header: "Name",
                cell: ({ row }) => (
                  <strong className="text-sm font-medium">
                    {row.original.asset?.name}
                  </strong>
                ),
              },
              {
                header: "Category",
                cell: ({ row }) => (
                  <span className="text-sm text-ink-muted">
                    {row.original.asset?.category?.name ?? "—"}
                  </span>
                ),
              },
              {
                header: "Condition",
                cell: ({ row }) => (
                  <StatusChip status={row.original.asset?.currentCondition} />
                ),
              },
              {
                header: "Since",
                cell: ({ row }) =>
                  new Date(row.original.allocatedAt).toLocaleDateString(),
              },
              {
                header: "Due",
                cell: ({ row }) =>
                  row.original.expectedReturnDate
                    ? new Date(
                        row.original.expectedReturnDate
                      ).toLocaleDateString()
                    : "Permanent",
              },
              {
                header: "Actions",
                cell: ({ row }) => (
                  <div className="flex items-center gap-2">
                    <Button
                      className="!h-7 !px-2.5 !text-xs"
                      onClick={() =>
                        openModal("transfer", row.original.asset ?? undefined)
                      }
                    >
                      Transfer
                    </Button>
                    <Button
                      className="!h-7 !px-2.5 !text-xs"
                      onClick={() =>
                        openModal("return", row.original.asset ?? undefined)
                      }
                    >
                      <RotateCcw size={12} /> Return
                    </Button>
                    <Button
                      className="!h-7 !px-2.5 !text-xs"
                      onClick={() =>
                        openModal(
                          "maintenance",
                          row.original.asset ?? undefined
                        )
                      }
                    >
                      <Wrench size={12} /> Issue
                    </Button>
                  </div>
                ),
              },
            ]}
          />
        </section>

        {/* Bottom row: Requests + Maintenance */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <section className="card flex flex-col gap-4 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium m-0">My Requests</h2>
              <Button
                className="!h-7 !px-2.5 !text-xs"
                onClick={() => navigate("/allocation-transfer")}
              >
                View All <ArrowRight size={12} />
              </Button>
            </div>
            <DataTable
              data={
                transfers.data?.filter(
                  (t: any) => t.requestedById === user?.id
                ) ?? []
              }
              empty="No requests submitted yet."
              columns={[
                {
                  header: "Asset",
                  cell: ({ row }) => (
                    <span style={{ fontSize: 13 }}>
                      {row.original.asset?.name ?? "—"}
                      {row.original.asset?.assetTag ? (
                        <span
                          className="mono muted"
                          style={{ fontSize: 11, marginLeft: 6 }}
                        >
                          ({row.original.asset.assetTag})
                        </span>
                      ) : null}
                    </span>
                  ),
                },
                {
                  header: "Status",
                  cell: ({ row }) => (
                    <StatusChip status={row.original.status} />
                  ),
                },
                {
                  header: "Date",
                  cell: ({ row }) =>
                    new Date(row.original.createdAt).toLocaleDateString(),
                },
              ]}
            />
          </section>

          <section className="card flex flex-col gap-4 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium m-0">Maintenance Tickets</h2>
              <Button
                className="!h-7 !px-2.5 !text-xs"
                onClick={() => navigate("/maintenance")}
              >
                View All <ArrowRight size={12} />
              </Button>
            </div>
            <DataTable
              data={
                maintenance.data?.filter(
                  (m: any) => m.requestedById === user?.id
                ) ?? []
              }
              empty="No maintenance tickets."
              columns={[
                {
                  header: "Asset",
                  cell: ({ row }) => (
                    <span className="text-sm">
                      {row.original.asset?.name ?? "—"}
                    </span>
                  ),
                },
                { header: "Issue", accessorKey: "issue" },
                {
                  header: "Priority",
                  cell: ({ row }) => (
                    <StatusChip status={row.original.priority} />
                  ),
                },
                {
                  header: "Status",
                  cell: ({ row }) => (
                    <StatusChip status={row.original.status} />
                  ),
                },
              ]}
            />
          </section>
        </div>

        {/* Modals */}
        {modal === "newAsset" && (
          <Modal title="Request New Asset" onClose={closeModal}>
            <SelectField
              label="Category"
              value={newAssetCategoryId}
              onChange={(e) => {
                setNewAssetCategoryId(e.target.value);
                setNewAssetId("");
              }}
            >
              <option value="">Select category…</option>
              {categories.data?.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Select Asset"
              value={newAssetId}
              onChange={(e) => setNewAssetId(e.target.value)}
              disabled={!newAssetCategoryId}
            >
              <option value="">
                {newAssetCategoryId
                  ? availableAssets.length
                    ? "Choose asset…"
                    : "No available assets in this category"
                  : "Select a category first"}
              </option>
              {availableAssets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.assetTag})
                </option>
              ))}
            </SelectField>
            <TextAreaField
              label="Reason"
              value={newAssetReason}
              onChange={(e) => setNewAssetReason(e.target.value)}
              placeholder="Why do you need this asset?"
            />
            <Button
              variant="primary"
              disabled={!newAssetId || !newAssetReason.trim()}
              onClick={() =>
                requestNewAsset.mutate({
                  assetId: newAssetId,
                  targetEmployeeId: user?.id,
                  reason: "NEW ASSET REQUEST: " + newAssetReason,
                })
              }
            >
              Submit Request
            </Button>
          </Modal>
        )}

        {modal === "transfer" && selectedAsset && (
          <Modal
            title="Request Transfer"
            subtitle={`Transfer "${selectedAsset.name}" (${selectedAsset.assetTag}) to a colleague`}
            onClose={closeModal}
          >
            <SelectField
              label="Transfer To"
              value={transferTargetId}
              onChange={(e) => setTransferTargetId(e.target.value)}
            >
              <option value="">Select colleague…</option>
              {otherEmployees.map((e: any) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.email})
                </option>
              ))}
            </SelectField>
            <TextAreaField
              label="Reason"
              value={transferReason}
              onChange={(e) => setTransferReason(e.target.value)}
              placeholder="Why are you transferring this asset?"
            />
            <Button
              variant="primary"
              disabled={!transferTargetId || !transferReason.trim()}
              onClick={() =>
                requestTransfer.mutate({
                  assetId: selectedAsset.id,
                  targetEmployeeId: transferTargetId,
                  reason: "TRANSFER REQUEST: " + transferReason,
                })
              }
            >
              Submit Transfer Request
            </Button>
          </Modal>
        )}

        {modal === "return" && selectedAsset && (
          <Modal
            title="Return Asset"
            subtitle={`Return "${selectedAsset.name}" (${selectedAsset.assetTag})`}
            onClose={closeModal}
          >
            <TextAreaField
              label="Return Notes"
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              placeholder="Asset condition, reason for return…"
            />
            <Button
              variant="primary"
              disabled={!returnReason.trim()}
              onClick={() =>
                requestReturn.mutate({
                  assetId: selectedAsset.id,
                  targetDepartmentId: user?.departmentId,
                  reason: "RETURN REQUEST: " + returnReason,
                })
              }
            >
              Submit Return
            </Button>
          </Modal>
        )}

        {modal === "maintenance" && selectedAsset && (
          <Modal
            title="Raise Maintenance Ticket"
            subtitle={`Report issue with "${selectedAsset.name}" (${selectedAsset.assetTag})`}
            onClose={closeModal}
          >
            <SelectField
              label="Priority"
              value={maintenancePriority}
              onChange={(e) =>
                setMaintenancePriority(e.target.value as typeof maintenancePriority)
              }
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </SelectField>
            <TextAreaField
              label="Describe the Issue"
              value={maintenanceIssue}
              onChange={(e) => setMaintenanceIssue(e.target.value)}
              placeholder="What is wrong with the asset?"
            />
            <Button
              variant="primary"
              disabled={!maintenanceIssue.trim()}
              onClick={() =>
                raiseMaintenance.mutate({
                  assetId: selectedAsset.id,
                  issue: maintenanceIssue,
                  priority: maintenancePriority,
                  conditionBefore: selectedAsset.currentCondition ?? "GOOD",
                })
              }
            >
              Submit Ticket
            </Button>
          </Modal>
        )}
      </div>
    );
  }

  // ── Admin / Asset Manager / Department Head View ──────────────────────────
  return (
    <div ref={containerRef} className="grid gap-7">
      {/* Overdue alert */}
      {dashData?.overdueReturns?.length > 0 && (
        <div
          className="alert danger"
          style={{ display: "flex", alignItems: "center", gap: 10 }}
        >
          <AlertTriangle size={18} style={{ color: "var(--danger-dot)" }} />
          <span>
            <strong>{dashData.overdueReturns.length}</strong> assets are overdue
            for return — immediate follow-up required.
          </span>
          <Button
            style={{ marginLeft: "auto", minHeight: 28, padding: "0 12px", fontSize: 12 }}
            onClick={() => navigate("/allocation-transfer")}
          >
            Review <ArrowRight size={12} />
          </Button>
        </div>
      )}

      {/* Header + quick actions */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title">
            Good{" "}
            {new Date().getHours() < 12
              ? "morning"
              : new Date().getHours() < 17
              ? "afternoon"
              : "evening"}
            , {user?.name.split(" ")[0]}
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Operational overview for{" "}
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(role === "ADMIN" || role === "ASSET_MANAGER") && (
            <Button variant="primary" onClick={() => navigate("/assets")}>
              <Plus size={16} /> Register Asset
            </Button>
          )}
          <Button onClick={() => navigate("/allocation-transfer")}>
            Allocate Asset
          </Button>
          <Button onClick={() => navigate("/booking")}>Book Resource</Button>
        </div>
      </div>

      {/* KPI stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Available Assets"
          value={dashData?.availableAssets ?? 0}
          icon={CheckCircle2}
          tint="emerald"
          detail={
            <span className="flex items-center gap-1 text-xs text-success">
              <CheckCircle2 size={13} /> Ready to allocate
            </span>
          }
        />
        <StatCard
          label="Allocated Assets"
          value={dashData?.allocatedAssets ?? 0}
          icon={PackageCheck}
          tint="indigo"
          detail={
            <span className="flex items-center gap-1 text-xs text-ink-muted">
              <PackageCheck size={13} /> Currently in use
            </span>
          }
        />
        <StatCard
          label="Pending Maintenance"
          value={dashData?.pendingMaintenance ?? 0}
          icon={Wrench}
          tint="rose"
          detail={
            <span
              className={`flex items-center gap-1 text-xs ${
                (dashData?.pendingMaintenance ?? 0) > 0
                  ? "text-warning"
                  : "text-success"
              }`}
            >
              <Wrench size={13} /> Needs attention
            </span>
          }
        />
        <StatCard
          label="Pending Transfers"
          value={dashData?.pendingTransfers ?? 0}
          icon={Clock}
          tint="amber"
          detail={
            <span
              className={`flex items-center gap-1 text-xs ${
                (dashData?.pendingTransfers ?? 0) > 0
                  ? "text-warning"
                  : "text-ink-muted"
              }`}
            >
              <Clock size={13} /> Awaiting approval
            </span>
          }
        />
      </div>

      {/* Second stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Active Bookings"
          value={dashData?.activeBookings ?? 0}
          icon={Clock}
          tint="slate"
          detail={
            <span className="text-xs text-ink-muted">
              Upcoming or in session
            </span>
          }
        />
        <StatCard
          label="Total Assets in System"
          value={(dashData?.availableAssets ?? 0) + (dashData?.allocatedAssets ?? 0)}
          detail={
            <span className="flex items-center gap-1 text-xs text-ink-muted">
              <TrendingUp size={13} /> Tracked assets
            </span>
          }
        />
        <StatCard
          label="Departments"
          value={dashData?.departmentSummary?.length ?? 0}
          detail={
            <span className="text-xs text-ink-muted">
              Active org units
            </span>
          }
        />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Activity feed */}
        <section className="card flex flex-col gap-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium m-0">Recent Activity</h2>
            <span className="text-xs text-ink-muted">
              Last 10 events
            </span>
          </div>
          {dashData?.recentActivities?.length ? (
            <div style={{ display: "grid", gap: 12 }}>
              {dashData.recentActivities.map((item: ActivityLog) => {
                let meta: any = {};
                try {
                  meta =
                    typeof item.metadata === "string"
                      ? JSON.parse(item.metadata)
                      : item.metadata ?? {};
                } catch {
                  meta = {};
                }
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-2.5 border-b border-border last:border-0"
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-[13px] font-semibold text-ink whitespace-nowrap overflow-hidden text-ellipsis">
                        {meta.assetName ?? meta.name ?? item.entityType}
                      </span>
                      <span className="text-xs text-ink-muted">
                        {labelize(item.action)}
                        {meta.assetTag ? (
                            <span className="font-mono ml-1.5 text-[11px] bg-surface-sunken px-1.5 py-0.5 rounded-sm">
                            {meta.assetTag}
                          </span>
                        ) : null}
                      </span>
                    </div>
                    <span className="text-[11px] text-ink-muted whitespace-nowrap">
                      <RelativeTime value={item.createdAt} />
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-ink-muted m-0">
              No recent activity logged.
            </p>
          )}
        </section>

        {/* Overdue + Upcoming Returns */}
        <section className="card flex flex-col gap-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium m-0">Asset Returns</h2>
            <Button
              className="!h-7 !px-2.5 !text-xs"
              onClick={() => navigate("/allocation-transfer")}
            >
              View All <ArrowRight size={12} />
            </Button>
          </div>
          {dashData?.overdueReturns?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-danger mb-2 uppercase tracking-wide">
                Overdue
              </p>
              {dashData.overdueReturns.map((item: Allocation) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: 13,
                    padding: "8px 0",
                    borderBottom: "1px solid var(--border-subtle)",
                  }}
                >
                  <div>
                    <strong>{item.asset?.name}</strong>{" "}
                    <span className="font-mono text-[11px] text-ink-muted">
                      {item.asset?.assetTag}
                    </span>
                    {item.employee && (
                      <div className="text-xs text-ink-muted">
                        Held by {item.employee.name}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-danger">
                    Due{" "}
                    {item.expectedReturnDate
                      ? new Date(
                          item.expectedReturnDate
                        ).toLocaleDateString()
                      : "TBD"}
                  </span>
                </div>
              ))}
            </div>
          )}
          {dashData?.upcomingReturns?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-ink-muted my-2 uppercase tracking-wide">
                Upcoming
              </p>
              {dashData.upcomingReturns.map((item: Allocation) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: 13,
                    padding: "8px 0",
                    borderBottom: "1px solid var(--border-subtle)",
                  }}
                >
                  <div>
                    <strong>{item.asset?.name}</strong>{" "}
                    <span
                      className="mono muted"
                      style={{ fontSize: 11 }}
                    >
                      {item.asset?.assetTag}
                    </span>
                    {item.employee && (
                      <div className="muted" style={{ fontSize: 12 }}>
                        Held by {item.employee.name}
                      </div>
                    )}
                  </div>
                  <span className="muted" style={{ fontSize: 12 }}>
                    Due{" "}
                    {item.expectedReturnDate
                      ? new Date(
                          item.expectedReturnDate
                        ).toLocaleDateString()
                      : "TBD"}
                  </span>
                </div>
              ))}
            </div>
          )}
          {!dashData?.overdueReturns?.length &&
            !dashData?.upcomingReturns?.length && (
              <p className="text-sm text-ink-muted m-0">
                No pending returns.
              </p>
            )}
        </section>
      </div>

      {/* Asset inventory chart + Department breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Bar chart */}
        <section className="card flex flex-col gap-4 p-5">
          <h2 className="text-lg font-medium m-0">Asset Status Overview</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={chartData}
              margin={{ top: 4, right: 4, left: -16, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="var(--border-subtle)"
              />
              <XAxis
                dataKey="name"
                stroke="var(--ink-400)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="var(--ink-400)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                cursor={{ fill: "var(--surface-sunken)" }}
                contentStyle={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--rounded-sm)",
                  fontSize: 12,
                }}
              />
              <Bar
                dataKey="value"
                fill="var(--signal-500)"
                radius={[4, 4, 0, 0]}
                barSize={36}
              />
            </BarChart>
          </ResponsiveContainer>
        </section>

        {/* Department summary */}
        <section className="card flex flex-col gap-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium m-0">Department Summary</h2>
            {role === "ADMIN" && (
              <Button
                className="!h-7 !px-2.5 !text-xs"
                onClick={() => navigate("/organization")}
              >
                Manage <ArrowRight size={12} />
              </Button>
            )}
          </div>
          {dashData?.departmentSummary?.length ? (
            <div className="flex flex-col gap-1.5">
              {dashData.departmentSummary.map((dept: any) => (
                <div
                  key={dept.id}
                  className="flex items-center justify-between py-2.5 px-3 bg-surface-sunken rounded-sm text-[13px]"
                >
                  <strong className="text-ink font-semibold">
                    {dept.name}
                  </strong>
                  <div className="flex items-center gap-4 text-xs text-ink-muted">
                    <span className="flex items-center gap-1">
                      <PackageCheck size={12} />
                      {dept._count.assets} assets
                    </span>
                    <span>
                      {dept._count.employees} people
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink-muted m-0">
              No departments created yet.{" "}
              {role === "ADMIN" && (
                <button
                  className="border-0 bg-transparent text-signal-500 cursor-pointer font-medium p-0 inline-flex items-center hover:underline"
                  onClick={() => navigate("/organization")}
                >
                  Create one →
                </button>
              )}
            </p>
          )}
        </section>
      </div>

      {/* All assets quick list */}
      <section className="card flex flex-col gap-4 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium m-0 flex items-center gap-2">
            <Box size={18} />
            Asset Registry (Recent)
          </h2>
          <Button
            variant="primary"
            className="!h-8 !px-3.5"
            onClick={() => navigate("/assets")}
          >
            View All Assets <ArrowRight size={14} />
          </Button>
        </div>
        <DataTable
          data={allAssets.data?.slice(0, 10) ?? []}
          empty="No assets registered yet. Click Register Asset to add one."
          columns={[
            {
              header: "Tag",
              cell: ({ row }) => (
                <span className="font-mono text-xs">
                  {row.original.assetTag}
                </span>
              ),
            },
            {
              header: "Name",
              cell: ({ row }) => (
                <strong className="text-sm font-semibold">{row.original.name}</strong>
              ),
            },
            {
              header: "Category",
              cell: ({ row }) => (
                <span className="text-[13px] text-ink-muted">
                  {row.original.category?.name ?? "—"}
                </span>
              ),
            },
            {
              header: "Department",
              cell: ({ row }) => (
                <span className="text-[13px] text-ink-muted">
                  {row.original.department?.name ?? "Unassigned"}
                </span>
              ),
            },
            {
              header: "Status",
              cell: ({ row }) => <StatusChip status={row.original.status} />,
            },
            {
              header: "Condition",
              cell: ({ row }) => (
                <StatusChip status={row.original.currentCondition} />
              ),
            },
            {
              header: "Location",
              cell: ({ row }) => (
                <span className="text-[13px] text-ink-muted">
                  {row.original.location ?? "—"}
                </span>
              ),
            },
          ]}
        />
      </section>

      {/* Pending Transfers quick list */}
      {(role === "ADMIN" ||
        role === "ASSET_MANAGER" ||
        role === "DEPARTMENT_HEAD") && (
        <section className="card flex flex-col gap-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium m-0">Pending Approvals</h2>
            <Button
              className="!h-7 !px-2.5 !text-xs"
              onClick={() => navigate("/allocation-transfer")}
            >
              Manage All <ArrowRight size={12} />
            </Button>
          </div>
          <DataTable
            data={
              transfers.data
                ?.filter((t: any) => t.status === "PENDING")
                .slice(0, 8) ?? []
            }
            empty="No pending transfer requests."
            columns={[
              {
                header: "Asset",
                cell: ({ row }) => (
                  <div>
                    <strong className="text-[13px] font-semibold">
                      {row.original.asset?.name ?? "Unknown"}
                    </strong>
                    {row.original.asset?.assetTag && (
                      <span className="font-mono text-[11px] text-ink-muted ml-1.5">
                        ({row.original.asset.assetTag})
                      </span>
                    )}
                  </div>
                ),
              },
              {
                header: "Requested By",
                cell: ({ row }) => (
                  <span className="text-[13px]">
                    {row.original.requestedBy?.name ?? "—"}
                  </span>
                ),
              },
              {
                header: "To",
                cell: ({ row }) => (
                  <span className="text-[13px] text-ink-muted">
                    {row.original.targetEmployee?.name ??
                      row.original.targetDepartment?.name ??
                      "—"}
                  </span>
                ),
              },
              {
                header: "Status",
                cell: ({ row }) => <StatusChip status={row.original.status} />,
              },
              {
                header: "Requested",
                cell: ({ row }) =>
                  new Date(row.original.createdAt).toLocaleDateString(),
              },
            ]}
          />
        </section>
      )}
    </div>
  );
}
