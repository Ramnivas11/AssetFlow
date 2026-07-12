import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, HardDrive, List, Grid, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { api, unwrap, toastApiError } from "../lib/api";
import { useList } from "../lib/queries";
import { assetStatusTone } from "../lib/status";
import { Asset, Category, Department } from "../lib/types";
import { DataTable, EmptyState, EntityDrawer, Section, StatusChip, Button } from "../ui/components";
import { AssetForm } from "../ui/forms";
import { useState, useRef } from "react";
import { useAuth } from "../state/auth";

export default function Assets() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Asset | null>(null);
  
  // States for search and filter
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  
  // Layout toggle
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN" || user?.role === "ASSET_MANAGER";
  
  // Dialog Toggle
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

  const assets = useList<Asset>("assets", `/assets?search=${encodeURIComponent(search)}`);
  const categories = useList<Category>("categories", "/asset-categories");
  const departments = useList<Department>("departments", "/departments");

  const create = useMutation({
    mutationFn: (body: any) => unwrap(api.post("/assets", body)),
    onSuccess: () => {
      toast.success("Asset registered successfully");
      setShowAddDialog(false);
      qc.invalidateQueries({ queryKey: ["assets"] });
    },
    onError: toastApiError
  });

  const update = useMutation({
    mutationFn: (body: any) => unwrap(api.patch(`/assets/${editingAsset?.id}`, body)),
    onSuccess: () => {
      toast.success("Asset updated successfully");
      setShowEditDialog(false);
      setSelected(null);
      qc.invalidateQueries({ queryKey: ["assets"] });
    },
    onError: toastApiError
  });

  // Filter local results if necessary, or pass query params to the backend API if supported.
  // We'll perform robust client-side filtering on categories/status/departments to guarantee immediate correct results.
  const filteredAssets = assets.data?.filter((asset) => {
    const matchesCategory = !categoryFilter || asset.categoryId === categoryFilter;
    const matchesStatus = !statusFilter || asset.status === statusFilter;
    const matchesDepartment = !departmentFilter || asset.departmentId === departmentFilter;
    return matchesCategory && matchesStatus && matchesDepartment;
  });

  const assetStates = ["AVAILABLE", "ALLOCATED", "RESERVED", "UNDER_MAINTENANCE", "LOST", "RETIRED", "DISPOSED"];

  return (
    <>
      <div className="toolbar">
        <h1 className="page-title">Assets Directory</h1>
        <div className="actions">
          <Button onClick={() => setShowAddDialog(true)} variant="primary">
            <Plus size={16} /> Register Asset
          </Button>
        </div>
      </div>

      {/* Filter and Search Panel */}
      <div className="card grid" style={{ gap: "12px", background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div style={{ display: "flex", gap: "12px", width: "100%", flexWrap: "wrap", alignItems: "center" }}>
          <input
            className="input"
            placeholder="Search by tag, serial, or QR code..."
            style={{ flex: 1, minWidth: "260px" }}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          
          <select
            className="select"
            style={{ maxWidth: "200px" }}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Category Filter"
          >
            <option value="">All Categories</option>
            {categories.data?.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>

          <select
            className="select"
            style={{ maxWidth: "200px" }}
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            aria-label="Department Filter"
          >
            <option value="">All Departments</option>
            {departments.data?.map((dept) => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>

          <div style={{ display: "inline-flex", border: "1px solid var(--border)", borderRadius: "var(--rounded-default)", overflow: "hidden" }}>
            <button
              onClick={() => setViewMode("list")}
              style={{
                border: 0,
                background: viewMode === "list" ? "var(--signal-50)" : "transparent",
                color: viewMode === "list" ? "var(--signal-600)" : "var(--ink-500)",
                padding: "8px 12px",
                cursor: "pointer",
                minHeight: "unset"
              }}
              title="List View"
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              style={{
                border: 0,
                background: viewMode === "grid" ? "var(--signal-50)" : "transparent",
                color: viewMode === "grid" ? "var(--signal-600)" : "var(--ink-500)",
                padding: "8px 12px",
                cursor: "pointer",
                minHeight: "unset"
              }}
              title="Grid View"
            >
              <Grid size={16} />
            </button>
          </div>
        </div>

        {/* Status Filter Chips */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center", borderTop: "1px solid var(--border-subtle)", paddingTop: "8px" }}>
          <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--ink-400)", textTransform: "uppercase", marginRight: "6px" }}>Status:</span>
          <button
            onClick={() => setStatusFilter("")}
            className="button"
            style={{
              minHeight: "28px",
              padding: "0 10px",
              fontSize: "12px",
              background: statusFilter === "" ? "var(--signal-50)" : "var(--surface)",
              color: statusFilter === "" ? "var(--signal-600)" : "var(--ink-700)",
              borderColor: statusFilter === "" ? "var(--signal-500)" : "var(--border)"
            }}
          >
            All
          </button>
          {assetStates.map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className="button"
              style={{
                minHeight: "28px",
                padding: "0 10px",
                fontSize: "12px",
                background: statusFilter === st ? "var(--signal-50)" : "var(--surface)",
                color: statusFilter === st ? "var(--signal-600)" : "var(--ink-700)",
                borderColor: statusFilter === st ? "var(--signal-500)" : "var(--border)"
              }}
            >
              {st.replace("_", " ").toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Asset Form Dialog Section */}
      {showAddDialog ? (
        <>
          <button className="drawer-backdrop" onClick={() => setShowAddDialog(false)} />
          <div className="drawer" style={{ left: "50%", right: "auto", top: "5%", height: "90vh", transform: "translateX(-50%)", width: "100%", maxWidth: "680px", borderRadius: "var(--rounded-lg)", border: "1px solid var(--border)" }}>
            <div className="drawer-header">
              <div>
                <h2 className="section-title">Register New Asset</h2>
                <p className="muted" style={{ fontSize: "12px", margin: "2px 0 0" }}>Asset tags are system-generated and format is AF-0001</p>
              </div>
              <Button style={{ minHeight: "32px", padding: "0 10px" }} onClick={() => setShowAddDialog(false)}>Cancel</Button>
            </div>
            <div style={{ overflow: "auto", padding: "8px 0" }}>
              <AssetForm
                categories={categories.data ?? []}
                departments={departments.data ?? []}
                onSubmit={(values) => create.mutate(values)}
              />
            </div>
          </div>
        </>
      ) : null}

      {showEditDialog && editingAsset ? (
        <>
          <button className="drawer-backdrop" onClick={() => { setShowEditDialog(false); setEditingAsset(null); }} />
          <div className="drawer" style={{ left: "50%", right: "auto", top: "5%", height: "90vh", transform: "translateX(-50%)", width: "100%", maxWidth: "680px", borderRadius: "var(--rounded-lg)", border: "1px solid var(--border)" }}>
            <div className="drawer-header">
              <div>
                <h2 className="section-title">Edit Asset Details</h2>
                <p className="mono muted" style={{ fontSize: "12px", margin: "2px 0 0" }}>{editingAsset.assetTag}</p>
              </div>
              <Button style={{ minHeight: "32px", padding: "0 10px" }} onClick={() => { setShowEditDialog(false); setEditingAsset(null); }}>Cancel</Button>
            </div>
            <div style={{ overflow: "auto", padding: "8px 0" }}>
              <AssetForm
                categories={categories.data ?? []}
                departments={departments.data ?? []}
                initialValues={editingAsset}
                onSubmit={(values) => update.mutate(values)}
              />
            </div>
          </div>
        </>
      ) : null}

      {/* Assets Directory rendering */}
      <Section query={assets}>
        {viewMode === "list" ? (
          <DataTable
            data={filteredAssets}
            empty="No assets match this filter"
            columns={[
              { 
                header: "Tag", 
                cell: ({ row }) => (
                  <button 
                    className="button mono" 
                    style={{ minHeight: "32px", padding: "0 10px", fontWeight: 600, color: "var(--signal-600)", background: "var(--signal-50)", border: "1px solid var(--signal-100)" }}
                    onClick={() => setSelected(row.original)}
                  >
                    {row.original.assetTag}
                  </button>
                ) 
              },
              { header: "Name", cell: ({ row }) => <strong>{row.original.name}</strong> },
              { header: "Category", cell: ({ row }) => row.original.category?.name ?? "N/A" },
              { header: "Status", cell: ({ row }) => <StatusChip status={row.original.status} tone={assetStatusTone[row.original.status]} /> },
              { header: "Location", accessorKey: "location" }
            ]}
          />
        ) : (
          <div className="grid cols-3">
            {filteredAssets?.length ? (
              filteredAssets.map((asset) => (
                <div key={asset.id} className="card grid hover-lift" style={{ gap: "12px", position: "relative", padding: "16px", cursor: "pointer" }} onClick={() => setSelected(asset)}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                    <span className="mono" style={{ fontSize: "12px", fontWeight: 600, color: "var(--ink-500)", background: "var(--surface-sunken)", padding: "2px 8px", borderRadius: "12px" }}>
                      {asset.assetTag}
                    </span>
                    <StatusChip status={asset.status} tone={assetStatusTone[asset.status]} />
                  </div>
                  <div>
                    <h3 className="section-title" style={{ fontSize: "16px", margin: 0, fontWeight: 600, color: "var(--ink-900)" }}>{asset.name}</h3>
                    <p className="muted" style={{ margin: "4px 0 0", fontSize: "13px" }}>{asset.category?.name} &bull; {asset.location}</p>
                  </div>
                  {asset.imageUrl ? (
                    <img 
                      src={asset.imageUrl} 
                      alt={asset.name} 
                      style={{ width: "100%", height: "140px", objectFit: "cover", borderRadius: "var(--rounded-md)", border: "1px solid var(--border-subtle)" }} 
                    />
                  ) : (
                    <div style={{ width: "100%", height: "140px", background: "var(--surface-sunken)", borderRadius: "var(--rounded-md)", display: "grid", placeItems: "center", border: "1px dashed var(--border)" }}>
                      <HardDrive size={24} style={{ color: "var(--ink-300)" }} />
                    </div>
                  )}
                  <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span className="mono muted" style={{ fontSize: "12px" }}>S/N: {asset.serialNumber || "—"}</span>
                    <Button style={{ minHeight: "28px", padding: "0 12px", fontSize: "12px" }}>View Details</Button>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ gridColumn: "span 3" }}>
                <EmptyState title="No assets match this filter" />
              </div>
            )}
          </div>
        )}
      </Section>

      {/* Asset Drawer */}
      <EntityDrawer
        open={Boolean(selected)}
        title={selected?.name ?? ""}
        subtitle={selected?.assetTag}
        onClose={() => setSelected(null)}
        tabs={[
          { 
            label: "Overview", 
            content: selected ? (
              <AssetOverview 
                asset={selected} 
                isAdmin={isAdmin} 
                onEdit={() => { 
                  setEditingAsset(selected); 
                  setShowEditDialog(true); 
                }} 
              />
            ) : null 
          },
          { 
            label: "Allocation History", 
            content: <AllocationHistoryList items={selected?.allocations} /> 
          },
          { 
            label: "Maintenance History", 
            content: <MaintenanceHistoryList items={selected?.maintenance} /> 
          },
          { 
            label: "Attachments", 
            content: (
              selected?.imageUrl ? (
                <div style={{ display: "grid", gap: "10px" }}>
                  <img src={selected.imageUrl} alt="Asset upload" style={{ width: "100%", borderRadius: "var(--rounded-lg)", border: "1px solid var(--border)" }} />
                </div>
              ) : (
                <EmptyState title="No attachments yet">No image or documents uploaded during asset registration.</EmptyState>
              )
            ) 
          },
          { 
            label: "QR Code", 
            content: selected ? (
              <div style={{ display: "grid", placeItems: "center", padding: "24px 0", gap: "12px" }}>
                <QRCodeSVG value={selected.assetTag} size={180} />
                <p className="mono muted" style={{ fontSize: "13px" }}>{selected.assetTag}</p>
              </div>
            ) : null 
          }
        ]}
      />
    </>
  );
}

const AssetOverview = ({ 
  asset, 
  isAdmin, 
  onEdit 
}: { 
  asset: Asset; 
  isAdmin: boolean; 
  onEdit: () => void; 
}) => (
  <div className="grid" style={{ gap: "16px", paddingTop: "12px" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <StatusChip status={asset.status} tone={assetStatusTone[asset.status]} />
        <span className="mono muted" style={{ fontSize: "13px" }}>Serial: {asset.serialNumber}</span>
      </div>
      {isAdmin ? (
        <Button onClick={onEdit} style={{ minHeight: "32px", padding: "0 10px", fontSize: "12px" }}>
          Edit Asset
        </Button>
      ) : null}
    </div>
    
    <div className="card grid cols-2" style={{ gap: "12px" }}>
      <div>
        <label className="muted" style={{ fontSize: "12px" }}>Category</label>
        <p style={{ margin: "2px 0 0", fontWeight: 600 }}>{asset.category?.name ?? "N/A"}</p>
      </div>
      <div>
        <label className="muted" style={{ fontSize: "12px" }}>Current Location</label>
        <p style={{ margin: "2px 0 0", fontWeight: 600 }}>{asset.location}</p>
      </div>
      <div>
        <label className="muted" style={{ fontSize: "12px" }}>Department</label>
        <p style={{ margin: "2px 0 0", fontWeight: 600 }}>{asset.department?.name ?? "Unassigned"}</p>
      </div>
      <div>
        <label className="muted" style={{ fontSize: "12px" }}>Condition</label>
        <p style={{ margin: "2px 0 0", fontWeight: 600 }}>{asset.currentCondition || "GOOD"}</p>
      </div>
      <div>
        <label className="muted" style={{ fontSize: "12px" }}>Acquisition Cost</label>
        <p className="mono" style={{ margin: "2px 0 0", fontWeight: 600 }}>${Number(asset.purchaseCost || 0).toFixed(2)}</p>
      </div>
      <div>
        <label className="muted" style={{ fontSize: "12px" }}>Acquisition Date</label>
        <p style={{ margin: "2px 0 0", fontWeight: 600 }}>{asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString() : "N/A"}</p>
      </div>
    </div>

    {asset.description ? (
      <div className="card grid" style={{ gap: "6px" }}>
        <label className="muted" style={{ fontSize: "12px" }}>Description / Additional Information</label>
        <p style={{ margin: 0, fontSize: "14px", whiteSpace: "pre-line", lineHeight: 1.4 }}>{asset.description}</p>
      </div>
    ) : null}
  </div>
);

const AllocationHistoryList = ({ items }: { items?: Array<any> }) => (
  items?.length ? (
    <div style={{ display: "grid", gap: "10px", paddingTop: "12px" }}>
      {items.map((item) => (
        <div key={item.id} className="card" style={{ display: "grid", gap: "6px", fontSize: "13px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong>{item.employee?.name || item.department?.name || "Holder"}</strong>
            <span className="mono muted">{new Date(item.allocatedAt).toLocaleDateString()}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="muted">Status: {item.allocationStatus}</span>
            {item.returnedAt ? (
              <span className="muted">Returned: {new Date(item.returnedAt).toLocaleDateString()}</span>
            ) : (
              <span style={{ color: "var(--warning-text)", fontWeight: 600 }}>Due: {item.expectedReturnDate ? new Date(item.expectedReturnDate).toLocaleDateString() : "TBD"}</span>
            )}
          </div>
          {item.returnNotes ? (
            <p style={{ margin: "4px 0 0", padding: "4px 6px", background: "var(--surface-sunken)", borderRadius: "4px", fontSize: "12px" }}>
              <strong>Return Notes:</strong> {item.returnNotes}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  ) : (
    <EmptyState title="No history yet">This asset has not been allocated to any employee or department yet.</EmptyState>
  )
);

const MaintenanceHistoryList = ({ items }: { items?: Array<any> }) => (
  items?.length ? (
    <div style={{ display: "grid", gap: "10px", paddingTop: "12px" }}>
      {items.map((item) => (
        <div key={item.id} className="card" style={{ display: "grid", gap: "6px", fontSize: "13px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong>{item.issue}</strong>
            <span className="mono muted">{new Date(item.createdAt).toLocaleDateString()}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Priority: <StatusChip status={item.priority} /></span>
            <span>Status: <StatusChip status={item.status} /></span>
          </div>
          {item.technician ? (
            <div className="muted" style={{ fontSize: "12px" }}>Assigned Technician: {item.technician.name}</div>
          ) : null}
          {item.resolution ? (
            <p style={{ margin: "4px 0 0", padding: "4px 6px", background: "var(--success-bg)", color: "var(--success-text)", borderRadius: "4px", fontSize: "12px" }}>
              <strong>Resolution:</strong> {item.resolution}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  ) : (
    <EmptyState title="No history yet">This asset has no maintenance logs recorded.</EmptyState>
  )
);
