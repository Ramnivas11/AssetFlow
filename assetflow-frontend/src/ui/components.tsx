import { ReactNode, useMemo, useState, useRef } from "react";
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { X, Calendar as CalendarIcon, Clock } from "lucide-react";
import { UseFormRegisterReturn } from "react-hook-form";
import { labelize, genericStatusTone } from "../lib/status";
import { StatusTone } from "../lib/types";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import * as Popover from "@radix-ui/react-popover";
import { DayPicker } from "react-day-picker";
import { format } from "date-fns";
import "react-day-picker/style.css";

gsap.registerPlugin(useGSAP);

export const Button = ({ children, variant, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "danger" }) => (
  <button className={`button ${variant ?? ""}`} {...props}>{children}</button>
);

export const StatusChip = ({ status, tone }: { status?: string | null; tone?: StatusTone }) => (
  <span className={`chip ${tone ?? genericStatusTone(status ?? undefined)}`} aria-label={`Status: ${labelize(status)}`}>{labelize(status)}</span>
);

export const StatCard = ({ label, value, detail, icon: Icon, tint = "indigo" }: { label: string; value: ReactNode; detail?: ReactNode; icon?: any; tint?: "indigo" | "amber" | "rose" | "emerald" | "slate" }) => {
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

  const tintMap = {
    indigo: "bg-signal-50 text-signal-600",
    amber: "bg-amber-50 text-amber-600",
    rose: "bg-rose-50 text-rose-600",
    emerald: "bg-success-bg text-success-dot",
    slate: "bg-surface-sunken text-ink-500"
  };

  return (
    <article className="stat-card group">
      <div className="flex justify-between items-start mb-2">
        <div className="text-sm font-medium text-ink-muted">{label}</div>
        {Icon && (
          <div className={`p-2 rounded-full ${tintMap[tint]}`}>
            <Icon size={18} strokeWidth={2} />
          </div>
        )}
      </div>
      <div className="stat-value" ref={valRef}>{value}</div>
      {detail ? <div className="mt-2 text-sm">{detail}</div> : null}
    </article>
  );
};

export const EmptyState = ({ title, children, icon: Icon, action }: { title: string; children?: ReactNode; icon?: any; action?: ReactNode }) => {
  const ref = useRef<HTMLDivElement>(null);
  
  useGSAP(() => {
    gsap.from(ref.current, { opacity: 0, scale: 0.98, duration: 0.3, ease: "power2.out" });
  }, { scope: ref });

  return (
    <div ref={ref} className="card text-center p-12 flex flex-col items-center justify-center gap-3">
      {Icon && <Icon size={48} strokeWidth={1} className="text-ink-300 mb-2" />}
      <h3 className="text-lg font-medium text-ink">{title}</h3>
      {children ? <p className="text-sm text-ink-muted max-w-md">{children}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
};

export const ErrorState = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <div className="rounded-lg border border-danger/30 bg-danger-bg p-5 flex flex-col gap-3 items-start">
    <strong className="text-sm font-medium text-danger">Unable to load this view.</strong>
    <p className="text-sm text-danger/80 m-0">{message}</p>
    {onRetry ? <Button onClick={onRetry} variant="danger">Retry</Button> : null}
  </div>
);

export const Skeleton = ({ lines = 3 }: { lines?: number }) => (
  <div className="grid gap-4 w-full">
    {Array.from({ length: lines }).map((_, index) => (
      <div key={index} className="h-16 w-full rounded-md bg-surface-sunken animate-pulse border border-border border-dashed" />
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
        y: 8,
        stagger: 0.02,
        duration: 0.4,
        ease: "power2.out"
      });
    }
  }, { scope: tbodyRef, dependencies: [data] });

  if (!data?.length) {
    // Attempt to extract title/children/action from the empty string if it's passed as JSON or simple string
    return (
      <div className="card table-wrap" style={{ display: "grid", placeItems: "center", padding: "64px 24px" }}>
        <p className="text-sm text-ink-muted">{empty}</p>
      </div>
    );
  }
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
        { x: 0, duration: 0.35, ease: "power3.out" }
      );
    }
  }, { scope: containerRef, dependencies: [open] });

  if (!open) return null;

  return (
    <div ref={containerRef} className="contents">
      <button ref={backdropRef} aria-label="Close drawer backdrop" className="fixed inset-0 z-40 bg-canvas/80 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <aside ref={drawerRef} className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg bg-surface border-l border-border shadow-2xl flex flex-col" role="dialog" aria-modal="true">
        <div className="flex items-start justify-between p-6 border-b border-border bg-canvas/50">
          <div>
            <p className="font-mono text-xs text-ink-muted uppercase tracking-wider mb-1">{subtitle}</p>
            <h2 className="text-xl font-medium text-ink m-0">{title}</h2>
          </div>
          <Button onClick={onClose} className="!p-2 !min-h-0"><X size={18} /></Button>
        </div>
        <div className="flex items-center gap-6 px-6 border-b border-border bg-surface">
          {tabs.map((tab, index) => (
            <button key={tab.label} className={`py-4 text-sm font-medium border-b-2 transition-colors ${index === active ? "border-primary text-primary" : "border-transparent text-ink-muted hover:text-ink hover:border-border"}`} onClick={() => setActive(index)}>{tab.label}</button>
          ))}
        </div>
        <div className="flex-1 overflow-auto p-6">{tabs[active]?.content}</div>
      </aside>
    </div>
  );
};

export const WorkflowRail = ({ steps, activeIndex }: { steps: string[]; activeIndex: number }) => (
  <div className="flex items-center gap-2">
    {steps.map((step, index) => (
      <div key={step} className="flex items-center gap-2">
        <div className={`flex items-center gap-2 text-sm font-medium ${index < activeIndex ? "text-primary" : index === activeIndex ? "text-ink drop-shadow-[0_0_8px_var(--color-primary)]" : "text-ink-muted"}`}>
          <span className={`flex items-center justify-center w-5 h-5 rounded-full border text-[10px] ${index < activeIndex ? "bg-primary border-primary text-white" : index === activeIndex ? "border-primary text-primary bg-primary/20" : "border-border text-ink-muted bg-surface-sunken"}`}>{index < activeIndex ? "✓" : index + 1}</span>
          {step}
        </div>
        {index < steps.length - 1 && <div className={`w-6 h-px ${index < activeIndex ? "bg-primary" : "bg-border"}`} />}
      </div>
    ))}
  </div>
);

export const KanbanBoard = <T extends { id: string }>({ columns, renderCard }: { columns: Array<{ title: string; tone?: StatusTone; items: T[] }>; renderCard: (item: T) => ReactNode }) => (
  <div className="kanban-board">
    {columns.map((column) => (
      <section className="kanban-column" key={column.title}>
        <div className="kanban-column-header">
          <strong className="text-sm font-medium text-ink">{column.title}</strong>
          <span className="font-mono text-[11px] font-medium text-ink-muted bg-border px-2 py-0.5 rounded-md">{column.items.length}</span>
        </div>
        <div className="flex flex-col gap-3 content-start">
          {column.items.map(renderCard)}
        </div>
      </section>
    ))}
  </div>
);

export const TextField = ({ label, error, registration, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: { message?: ReactNode }; registration?: UseFormRegisterReturn }) => (
  <div className="flex flex-col gap-1.5 w-full">
    <label className="text-[13px] font-medium text-ink-muted">{label}</label>
    <input className="input" {...registration} {...props} />
    {error ? <span className="text-[13px] text-danger mt-1">{error.message}</span> : null}
  </div>
);

export const SelectField = ({ label, error, registration, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: { message?: ReactNode }; registration?: UseFormRegisterReturn; children: ReactNode }) => (
  <div className="flex flex-col gap-1.5 w-full">
    <label className="text-[13px] font-medium text-ink-muted">{label}</label>
    <select className="select" {...registration} {...props}>{children}</select>
    {error ? <span className="text-[13px] text-danger mt-1">{error.message}</span> : null}
  </div>
);

export const TextAreaField = ({ label, error, registration, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: { message?: ReactNode }; registration?: UseFormRegisterReturn }) => (
  <div className="flex flex-col gap-1.5 w-full">
    <label className="text-[13px] font-medium text-ink-muted">{label}</label>
    <textarea className="textarea" {...registration} {...props} />
    {error ? <span className="text-[13px] text-danger mt-1">{error.message}</span> : null}
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
  return <span className="tabular-nums">{label}</span>;
};

export const DatePicker = ({ label, value, onChange, error }: { label: string; value?: string; onChange: (v: string) => void; error?: { message?: ReactNode } }) => {
  const date = value ? new Date(value) : undefined;
  
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label className="text-[13px] font-medium text-ink-muted">{label}</label>
      <Popover.Root>
        <Popover.Trigger asChild>
          <button className={`input text-left flex items-center justify-between ${!value ? "text-ink-400" : "text-ink"}`}>
            {value ? format(date!, "PPP") : "Select date"}
            <CalendarIcon size={16} className="text-ink-400" />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content className="z-50 bg-surface border border-border rounded-lg shadow-lg p-2" sideOffset={4} align="start">
            <DayPicker mode="single" selected={date} onSelect={(d) => d && onChange(d.toISOString())} />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
      {error ? <span className="text-[13px] text-danger mt-1">{error.message}</span> : null}
    </div>
  );
};

export const DateTimePicker = ({ label, value, onChange, error }: { label: string; value?: string; onChange: (v: string) => void; error?: { message?: ReactNode } }) => {
  const date = value ? new Date(value) : undefined;
  
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label className="text-[13px] font-medium text-ink-muted">{label}</label>
      <div className="flex gap-2">
        <Popover.Root>
          <Popover.Trigger asChild>
            <button className={`input text-left flex items-center justify-between flex-1 ${!value ? "text-ink-400" : "text-ink"}`}>
              {value ? format(date!, "PPP") : "Select date"}
              <CalendarIcon size={16} className="text-ink-400" />
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content className="z-50 bg-surface border border-border rounded-lg shadow-lg p-2" sideOffset={4} align="start">
              <DayPicker 
                mode="single" 
                selected={date} 
                onSelect={(d) => {
                  if (d) {
                    const newDate = date ? new Date(date) : new Date();
                    newDate.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
                    onChange(newDate.toISOString());
                  }
                }} 
              />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
        
        <input 
          type="time" 
          className="input" 
          style={{ width: "120px" }}
          value={date ? format(date, "HH:mm") : ""}
          onChange={(e) => {
            if (e.target.value && date) {
              const [hours, minutes] = e.target.value.split(":");
              const newDate = new Date(date);
              newDate.setHours(parseInt(hours, 10));
              newDate.setMinutes(parseInt(minutes, 10));
              onChange(newDate.toISOString());
            } else if (e.target.value && !date) {
              const [hours, minutes] = e.target.value.split(":");
              const newDate = new Date();
              newDate.setHours(parseInt(hours, 10));
              newDate.setMinutes(parseInt(minutes, 10));
              onChange(newDate.toISOString());
            }
          }}
        />
      </div>
      {error ? <span className="text-[13px] text-danger mt-1">{error.message}</span> : null}
    </div>
  );
};
