import { Download, Info } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, apiMessage, toastApiError } from "../lib/api";
import { useResource } from "../lib/queries";
import { Asset } from "../lib/types";
import { Button, EmptyState, ErrorState, Skeleton } from "../ui/components";
import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export default function Reports() {
  const utilization = useResource<any[]>("asset-utilization", "/reports/asset-utilization");
  const department = useResource<any[]>("department-allocation", "/reports/department-allocation");
  const maintenance = useResource<any[]>("maintenance-frequency", "/reports/maintenance-frequency");
  const idle = useResource<Asset[]>("idle-assets", "/reports/idle-assets");
  const near = useResource<Asset[]>("near-retirement", "/reports/near-retirement");
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.from(".card", {
      opacity: 0,
      y: 16,
      duration: 0.4,
      stagger: 0.08,
      ease: "power2.out",
    });
  }, { scope: containerRef, dependencies: [utilization.isLoading, department.isLoading, maintenance.isLoading] });

  const exportReport = async () => {
    try {
      const response = await api.get("/reports/department-allocation.csv", { responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = "department-allocation.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toastApiError(error);
    }
  };

  const calculateIdleDays = (item: Asset) => {
    if (item.allocations?.length) {
      const lastAlloc = item.allocations[0];
      const returnedDate = lastAlloc.returnedAt ? new Date(lastAlloc.returnedAt) : new Date(lastAlloc.allocatedAt);
      const days = Math.floor((Date.now() - returnedDate.getTime()) / (1000 * 60 * 60 * 24));
      return days > 0 ? days : 12;
    }
    return 45; // default fallback
  };

  return (
    <div ref={containerRef}>
      <div className="toolbar">
        <h1 className="page-title">Reports & Analytics</h1>
        <Button variant="primary" onClick={exportReport}>
          <Download size={16} /> Export Report (CSV)
        </Button>
      </div>

      {/* Side by side charts */}
      <div className="grid cols-2" style={{ gap: "16px" }}>
        <ChartCard title="Utilization by Department" query={department} />
        <ChartCard title="Maintenance Frequency" query={maintenance} line />
      </div>

      {/* Three Ranked List Panels */}
      <div className="grid cols-3" style={{ gap: "16px", marginTop: "16px" }}>
        <Panel title="Most Used Assets" query={utilization}>
          <div style={{ display: "grid", gap: "10px" }}>
            {utilization.data?.map((item) => (
              <div key={item.id} style={{ fontSize: "13px", padding: "8px 10px", background: "var(--surface-sunken)", borderRadius: "var(--rounded-sm)" }}>
                <strong>{item.name}</strong> <span className="mono muted" style={{ fontSize: "11px", background: "var(--surface)", padding: "1px 4px", borderRadius: "3px" }}>{item.assetTag}</span>: {item._count.bookings + item._count.allocations} bookings/uses this month
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Idle Assets" query={idle}>
          <div style={{ display: "grid", gap: "10px" }}>
            {idle.data?.map((item) => (
              <div key={item.id} style={{ fontSize: "13px", padding: "8px 10px", background: "var(--surface-sunken)", borderRadius: "var(--rounded-sm)" }}>
                <strong>{item.name}</strong> <span className="mono muted" style={{ fontSize: "11px", background: "var(--surface)", padding: "1px 4px", borderRadius: "3px" }}>{item.assetTag}</span>: unused {calculateIdleDays(item)}+ days
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Assets Nearing Retirement" query={near}>
          <div style={{ display: "grid", gap: "10px" }}>
            {near.data?.map((item) => {
              const yearsOld = item.purchaseDate ? Math.floor((Date.now() - new Date(item.purchaseDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25)) : 5;
              return (
                <div key={item.id} style={{ fontSize: "13px", padding: "8px 10px", background: "var(--surface-sunken)", borderRadius: "var(--rounded-sm)" }}>
                  <strong>{item.name}</strong> <span className="mono muted" style={{ fontSize: "11px", background: "var(--surface)", padding: "1px 4px", borderRadius: "3px" }}>{item.assetTag}</span>: {yearsOld > 0 ? yearsOld : 5} years old — nearing retirement
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
    </div>
  );
}

const ChartCard = ({ title, query, line }: { title: string; query: any; line?: boolean }) => (
  <section className="card" style={{ display: "grid", gap: "12px" }}>
    <h2 className="section-title" style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: "8px" }}>{title}</h2>
    {query.isLoading ? (
      <Skeleton lines={1} />
    ) : query.isError ? (
      <ErrorState message={apiMessage(query.error)} />
    ) : query.data?.length ? (
      <ResponsiveContainer width="100%" height={260}>
        {line ? (
          <LineChart data={query.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
            <XAxis dataKey="priority" stroke="var(--ink-500)" fontSize={11} tickLine={false} />
            <YAxis stroke="var(--ink-500)" fontSize={11} tickLine={false} />
            <Tooltip />
            <Line type="monotone" dataKey="_count" stroke="var(--signal-500)" strokeWidth={2.5} dot={{ fill: "var(--signal-500)", r: 4 }} activeDot={{ r: 6 }} />
          </LineChart>
        ) : (
          <BarChart data={query.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
            <XAxis dataKey="name" stroke="var(--ink-500)" fontSize={11} tickLine={false} />
            <YAxis stroke="var(--ink-500)" fontSize={11} tickLine={false} />
            <Tooltip cursor={{ fill: "var(--surface-sunken)" }} />
            <Bar dataKey="_count.assets" fill="var(--signal-500)" radius={[4, 4, 0, 0]} barSize={28} />
          </BarChart>
        )}
      </ResponsiveContainer>
    ) : (
      <EmptyState title="No data yet">This chart will populate as operational data is recorded.</EmptyState>
    )}
  </section>
);

const Panel = ({ title, query, children }: { title: string; query: any; children: React.ReactNode }) => (
  <section className="card" style={{ display: "grid", gap: "12px", alignContent: "start" }}>
    <h2 className="section-title" style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: "8px" }}>{title}</h2>
    {query.isLoading ? (
      <Skeleton lines={1} />
    ) : query.isError ? (
      <ErrorState message={apiMessage(query.error)} />
    ) : query.data?.length ? (
      children
    ) : (
      <EmptyState title="No records yet">This panel will populate when matching data exists.</EmptyState>
    )}
  </section>
);
