import { ReactNode, useMemo, useState, useRef } from "react";
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { X } from "lucide-react";
import { UseFormRegisterReturn } from "react-hook-form";
import { labelize, genericStatusTone } from "../lib/status";
import { StatusTone } from "../lib/types";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export const Button = ({ children, variant, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "danger" }) => (
  <button className={`button ${variant ?? ""}`} {...props}>{children}</button>
);

export const StatusChip = ({ status, tone }: { status?: string | null; tone?: StatusTone }) => (
  <span className={`chip ${tone ?? genericStatusTone(status ?? undefined)}`} aria-label={`Status: ${labelize(status)}`}>{labelize(status)}</span>
);

export const StatCard = ({ label, value, detail }: { label: string; value: ReactNode; detail?: ReactNode }) => {
  const numValue = typeof value === "number" ? value : parseFloat(String(value).replace(/[^0-9.-]+/g, ""));
  const isNumber = !isNaN(numValue) && String(value).trim() !== "";
  
  const valRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!isNumber || !valRef.current) return;
    gsap.from(valRef.current, {
      textContent: 0,
      duration: 1.5,
      ease: "power3.out",
      snap: { textContent: 1 },
      stagger: 1
    });
  }, { scope: valRef, dependencies: [isNumber, value] });

  return (
    <article className="stat-card">
      <div className="stat-value" ref={valRef}>{value}</div>
      <div className="muted" style={{ fontSize: "13px", fontWeight: 500, marginTop: 4 }}>{label}</div>
      {detail ? <div style={{ marginTop: 8 }}>{detail}</div> : null}
    </article>
  );
};

export const EmptyState = ({ title, children }: { title: string; children?: ReactNode }) => (
  <div className="card" style={{ textAlign: "center", padding: 32, display: "grid", gap: 8, placeItems: "center" }}>
    <h3 className="section-title" style={{ color: "var(--ink-700)" }}>{title}</h3>
    {children ? <p className="muted" style={{ margin: 0, fontSize: "14px" }}>{children}</p> : null}
  </div>
);

export const ErrorState = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <div className="alert danger grid" style={{ gap: 8 }}>
    <strong style={{ fontSize: "15px" }}>Unable to load this view.</strong>
    <p style={{ margin: 0, fontSize: "14px" }}>{message}</p>
    {onRetry ? <Button onClick={onRetry} style={{ justifySelf: "start", minHeight: "36px" }}>Retry</Button> : null}
  </div>
);

export const Skeleton = ({ lines = 3 }: { lines?: number }) => (
  <div className="grid">
    {Array.from({ length: lines }).map((_, index) => (
      <div key={index} className="card" style={{ height: 72, opacity: 0.5, background: "var(--surface-sunken)", borderStyle: "dashed" }} />
    ))}
  </div>
);

export const Section = ({ query, children }: { query: { isLoading: boolean; isError: boolean; error: unknown; refetch: () => void }; children: ReactNode }) => {
  if (query.isLoading) return <Skeleton />;
  if (query.isError) return <ErrorState message={query.error instanceof Error ? query.error.message : "Something went wrong"} onRetry={query.refetch} />;
  return <>{children}</>;
};

export function DataTable<T>({ data, columns, empty }: { data?: T[]; columns: ColumnDef<T>[]; empty: string }) {
  const table = useReactTable({ data: data ?? [], columns, getCoreRowModel: getCoreRowModel() });
  const tbodyRef = useRef<HTMLTableSectionElement>(null);

  useGSAP(() => {
    if (data && data.length > 0) {
      gsap.from(tbodyRef.current?.children || [], {
        opacity: 0,
        y: 10,
        stagger: 0.03,
        duration: 0.3,
        ease: "power2.out"
      });
    }
  }, { scope: tbodyRef, dependencies: [data] });

  if (!data?.length) return <EmptyState title={empty}>Use the actions above to add or filter records.</EmptyState>;
  return (
    <div className="table-wrap">
      <table>
        <thead>{table.getHeaderGroups().map((group) => <tr key={group.id}>{group.headers.map((header) => <th key={header.id}>{flexRender(header.column.columnDef.header, header.getContext())}</th>)}</tr>)}</thead>
        <tbody ref={tbodyRef}>{table.getRowModel().rows.map((row) => <tr key={row.id}>{row.getVisibleCells().map((cell) => <td key={cell.id} data-label={String(cell.column.columnDef.header ?? "")}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

export const EntityDrawer = ({ open, title, subtitle, onClose, tabs }: { open: boolean; title: string; subtitle?: string; onClose: () => void; tabs: Array<{ label: string; content: ReactNode }> }) => {
  const [active, setActive] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    if (open) {
      gsap.fromTo(backdropRef.current, 
        { opacity: 0 }, 
        { opacity: 1, duration: 0.2, ease: "power2.out" }
      );
      gsap.fromTo(drawerRef.current, 
        { x: "100%" }, 
        { x: 0, duration: 0.32, ease: "power3.out" }
      );
    }
  }, { scope: containerRef, dependencies: [open] });

  if (!open) return null;

  return (
    <div ref={containerRef} style={{ display: "contents" }}>
      <button ref={backdropRef} aria-label="Close drawer backdrop" className="drawer-backdrop" onClick={onClose} />
      <aside ref={drawerRef} className="drawer" role="dialog" aria-modal="true">
        <div className="drawer-header">
          <div>
            <p className="mono muted" style={{ margin: 0, fontSize: "13px" }}>{subtitle}</p>
            <h2 className="section-title" style={{ margin: "4px 0 0" }}>{title}</h2>
          </div>
          <Button onClick={onClose} style={{ minHeight: "36px", padding: "0 10px" }}><X size={16} /> Close</Button>
        </div>
        <div className="tabs">{tabs.map((tab, index) => <button key={tab.label} className={index === active ? "active" : ""} onClick={() => setActive(index)}>{tab.label}</button>)}</div>
        <div style={{ flex: 1, overflow: "auto" }}>{tabs[active]?.content}</div>
      </aside>
    </div>
  );
};

export const WorkflowRail = ({ steps, activeIndex }: { steps: string[]; activeIndex: number }) => (
  <div className="workflow">{steps.map((step, index) => <div key={step} className={`workflow-node ${index < activeIndex ? "done" : index === activeIndex ? "active" : ""}`}><span className="workflow-dot" />{step}</div>)}</div>
);

export const KanbanBoard = <T extends { id: string }>({ columns, renderCard }: { columns: Array<{ title: string; tone?: StatusTone; items: T[] }>; renderCard: (item: T) => ReactNode }) => (
  <div className="kanban">
    {columns.map((column) => (
      <section className="kanban-column" key={column.title}>
        <div className="kanban-column-header">
          <strong style={{ fontSize: "14px", fontWeight: 600, color: "var(--ink-700)" }}>{column.title}</strong>
          <span className="mono muted" style={{ fontSize: "12px", background: "var(--surface)", padding: "2px 6px", borderRadius: "4px" }}>{column.items.length}</span>
        </div>
        <div style={{ display: "grid", gap: "10px", alignContent: "start" }}>
          {column.items.map(renderCard)}
        </div>
      </section>
    ))}
  </div>
);

export const TextField = ({ label, error, registration, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: { message?: ReactNode }; registration?: UseFormRegisterReturn }) => (
  <div className="field">
    <label>{label}</label>
    <input className="input" {...registration} {...props} />
    {error ? <span className="error-text">{error.message}</span> : null}
  </div>
);

export const SelectField = ({ label, error, registration, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: { message?: ReactNode }; registration?: UseFormRegisterReturn; children: ReactNode }) => (
  <div className="field">
    <label>{label}</label>
    <select className="select" {...registration} {...props}>{children}</select>
    {error ? <span className="error-text">{error.message}</span> : null}
  </div>
);

export const TextAreaField = ({ label, error, registration, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: { message?: ReactNode }; registration?: UseFormRegisterReturn }) => (
  <div className="field">
    <label>{label}</label>
    <textarea className="textarea" {...registration} {...props} />
    {error ? <span className="error-text">{error.message}</span> : null}
  </div>
);

export const RelativeTime = ({ value }: { value: string }) => {
  const label = useMemo(() => {
    const seconds = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }, [value]);
  return <span>{label}</span>;
};
