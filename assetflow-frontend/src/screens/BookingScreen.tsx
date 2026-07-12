import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, apiMessage, toastApiError, unwrap } from "../lib/api";
import { useList } from "../lib/queries";
import { labelize } from "../lib/status";
import { Asset, Booking } from "../lib/types";
import { Button, DataTable, EmptyState, Section, StatusChip, TextField, TextAreaField, SelectField, DateTimePicker } from "../ui/components";
import { useState, useMemo } from "react";
import { CalendarDays, Clock, AlertCircle } from "lucide-react";

export default function BookingScreen() {
  const qc = useQueryClient();
  const [assetId, setAssetId] = useState("");
  
  // New Booking Form State
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  
  // Reschedule Dialog State
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [reschedStart, setReschedStart] = useState("");
  const [reschedEnd, setReschedEnd] = useState("");

  // Filter and Layout Toggles
  const [viewMode, setViewMode] = useState<"month" | "week" | "day" | "timeline">("day");
  const [statusFilter, setStatusFilter] = useState("");

  const assets = useList<Asset>("assets-bookable", "/assets");
  const bookings = useList<Booking>("bookings", assetId ? `/bookings?assetId=${assetId}` : "/bookings");

  const create = useMutation({
    mutationFn: (body: any) => unwrap(api.post("/bookings", body)),
    onSuccess: () => {
      toast.success("Booking created successfully");
      setTitle("");
      setStartTime("");
      setEndTime("");
      qc.invalidateQueries({ queryKey: ["bookings"] });
    },
    onError: toastApiError
  });

  const cancel = useMutation({
    mutationFn: (id: string) => unwrap(api.patch(`/bookings/${id}/cancel`)),
    onSuccess: () => {
      toast.success("Booking cancelled successfully");
      qc.invalidateQueries({ queryKey: ["bookings"] });
    },
    onError: toastApiError
  });

  const reschedule = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => unwrap(api.patch(`/bookings/${id}/reschedule`, body)),
    onSuccess: () => {
      toast.success("Booking rescheduled successfully");
      setEditingBooking(null);
      qc.invalidateQueries({ queryKey: ["bookings"] });
    },
    onError: toastApiError
  });

  const bookableAssets = useMemo(() => {
    return assets.data?.filter((asset) => asset.isBookable) || [];
  }, [assets.data]);

  const selectedAsset = useMemo(() => {
    return bookableAssets.find((a) => a.id === assetId) || null;
  }, [bookableAssets, assetId]);

  // Compute visual conflicts
  const conflicts = useMemo(() => {
    if (!startTime || !endTime || !bookings.data?.length) return [];
    const reqStart = new Date(startTime);
    const reqEnd = new Date(endTime);
    if (isNaN(reqStart.getTime()) || isNaN(reqEnd.getTime())) return [];

    return bookings.data.filter((booking) => {
      if (booking.status === "CANCELLED") return false;
      const bStart = new Date(booking.startTime);
      const bEnd = new Date(booking.endTime);
      // Overlap calculation: bStart < reqEnd && reqStart < bEnd
      return bStart < reqEnd && reqStart < bEnd;
    });
  }, [startTime, endTime, bookings.data]);

  // Filtered Bookings for List View
  const filteredBookings = useMemo(() => {
    return bookings.data?.filter(b => !statusFilter || b.status === statusFilter) || [];
  }, [bookings.data, statusFilter]);

  const getHourString = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  return (
    <>
      <div className="toolbar">
        <h1 className="page-title">Resource Booking</h1>
      </div>

      <div className="grid cols-3" style={{ gap: "16px" }}>
        {/* Resource Selector & Controls */}
        <div className="card grid" style={{ gridColumn: "span 2", gap: "16px", alignContent: "start" }}>
          <h2 className="section-title">Select Bookable Resource</h2>
          <SelectField label="Resource Room / Equipment" value={assetId} onChange={(event) => setAssetId(event.target.value)}>
            <option value="">Select resource...</option>
            {bookableAssets.map((asset) => (
              <option key={asset.id} value={asset.id}>{asset.name} — {asset.assetTag} ({asset.location})</option>
            ))}
          </SelectField>

          {selectedAsset ? (
            <div style={{ display: "flex", gap: "12px", borderTop: "1px solid var(--border-subtle)", paddingTop: "12px", alignItems: "center" }}>
              <span className="muted" style={{ fontSize: "14px" }}>View Layout:</span>
              <div style={{ display: "inline-flex", border: "1px solid var(--border)", borderRadius: "var(--rounded-default)", overflow: "hidden" }}>
                {(["month", "week", "day", "timeline"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    style={{
                      border: 0,
                      background: viewMode === mode ? "var(--signal-50)" : "transparent",
                      color: viewMode === mode ? "var(--signal-600)" : "var(--ink-500)",
                      padding: "6px 12px",
                      cursor: "pointer",
                      textTransform: "capitalize",
                      fontSize: "12px",
                      fontWeight: 600,
                      minHeight: "unset"
                    }}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Raise Booking Request */}
        <div className="card grid" style={{ gap: "12px", alignContent: "start" }}>
          <h2 className="section-title">Book a Slot</h2>
          <TextField label="Booking Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Procurement Sync" />
          <DateTimePicker label="Start Time" value={startTime} onChange={setStartTime} />
          <DateTimePicker label="End Time" value={endTime} onChange={setEndTime} />
          
          <Button 
            variant="primary" 
            onClick={() => create.mutate({ assetId, title, startTime, endTime })}
            disabled={!assetId || !title || !startTime || !endTime || conflicts.length > 0}
            style={{ width: "100%", marginTop: "8px" }}
          >
            Book a slot
          </Button>
        </div>
      </div>

      {/* Visual Timeline and Conflicts Panel */}
      {selectedAsset ? (
        <div className="grid" style={{ marginTop: "16px" }}>
          <h3 className="section-title">Schedule Overview: {selectedAsset.name}</h3>
          
          {/* Day Grid with Overlap Conflict Hatches */}
          <div className="card timeline" style={{ padding: "12px", background: "var(--surface)", border: "1px solid var(--border)" }}>
            {["09:00", "10:00", "11:00", "12:00", "13:00"].map((hour) => {
              const hourNum = Number(hour.split(":")[0]);
              
              // Find existing bookings in this slot hour
              const slotBookings = bookings.data?.filter((b) => {
                if (b.status === "CANCELLED") return false;
                const bHour = new Date(b.startTime).getHours();
                return bHour === hourNum;
              }) || [];

              // Check if the current request conflicts in this hour slot
              const slotConflicts = conflicts.filter((c) => {
                const cHour = new Date(c.startTime).getHours();
                return cHour === hourNum || (new Date(startTime).getHours() === hourNum);
              });

              return (
                <div className="slot" key={hour}>
                  <div className="slot-time">{hour}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", padding: "4px", width: "100%" }}>
                    {slotBookings.map((booking) => {
                      const ongoing = new Date(booking.startTime) <= new Date() && new Date(booking.endTime) >= new Date();
                      const statusTone = booking.status === "APPROVED" || booking.status === "ACTIVE" ? "success" : "neutral";
                      return (
                        <div key={booking.id} className="booking-block" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <strong>{labelize(booking.status)}</strong> — {booking.bookedBy?.name || "Procurement Team"} — {getHourString(booking.startTime)} to {getHourString(booking.endTime)}
                            {ongoing ? <span style={{ marginLeft: "8px", fontSize: "11px", background: "var(--success-bg)", color: "var(--success-text)", padding: "1px 5px", borderRadius: "3px" }}>Ongoing</span> : null}
                          </div>
                          <div className="actions" style={{ gap: "4px" }}>
                            <Button style={{ minHeight: "26px", padding: "0 6px", fontSize: "11px" }} onClick={() => {
                              setEditingBooking(booking);
                              setReschedStart(booking.startTime.slice(0, 16));
                              setReschedEnd(booking.endTime.slice(0, 16));
                            }}>
                              Reschedule
                            </Button>
                            <Button variant="danger" style={{ minHeight: "26px", padding: "0 6px", fontSize: "11px" }} onClick={() => cancel.mutate(booking.id)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      );
                    })}

                    {/* Conflict overlap block */}
                    {startTime && endTime && slotConflicts.length > 0 && selectedAsset ? (
                      <div className="booking-block conflict" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <AlertCircle size={14} style={{ color: "var(--danger-dot)" }} />
                        <span>Requested {getHourString(startTime)} to {getHourString(endTime)} — conflict — slot is unavailable</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={{ marginTop: "16px" }}>
          <EmptyState title="No resource selected">Select a resource room or equipment from the menu above to see schedule details.</EmptyState>
        </div>
      )}

      {/* Reschedule Modal */}
      {editingBooking ? (
        <>
          <button className="drawer-backdrop" onClick={() => setEditingBooking(null)} />
          <div className="drawer" style={{ left: "50%", right: "auto", top: "25%", height: "auto", transform: "translateX(-50%)", width: "100%", maxWidth: "440px", borderRadius: "var(--rounded-lg)", border: "1px solid var(--border)", padding: "20px" }}>
            <h3 className="section-title">Reschedule Booking</h3>
            <p className="muted" style={{ fontSize: "13px" }}>{editingBooking.title}</p>
            <div className="grid" style={{ gap: "12px", marginTop: "12px" }}>
              <DateTimePicker label="New Start Time" value={reschedStart} onChange={setReschedStart} />
              <DateTimePicker label="New End Time" value={reschedEnd} onChange={setReschedEnd} />
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "8px" }}>
                <Button onClick={() => setEditingBooking(null)}>Cancel</Button>
                <Button variant="primary" onClick={() => reschedule.mutate({ id: editingBooking.id, body: { startTime: reschedStart, endTime: reschedEnd } })}>Save Changes</Button>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {/* Booking List Directory */}
      <section style={{ marginTop: "24px" }}>
        <h2 className="section-title" style={{ marginBottom: "12px" }}>Existing Bookings Directory</h2>
        <div className="toolbar" style={{ background: "var(--surface)", padding: "12px", border: "1px solid var(--border)", borderRadius: "var(--rounded-lg)", marginBottom: "12px" }}>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--ink-400)", textTransform: "uppercase" }}>Filter Status:</span>
            {["", "PENDING", "APPROVED", "ACTIVE", "COMPLETED", "CANCELLED"].map((st) => (
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
                {st ? st.toLowerCase() : "all"}
              </button>
            ))}
          </div>
        </div>

        <Section query={bookings}>
          <DataTable
            data={filteredBookings}
            empty="No bookings match this filter"
            columns={[
              { header: "Title", cell: ({ row }) => <strong>{row.original.title}</strong> },
              { header: "Booked By", cell: ({ row }) => row.original.bookedBy?.name ?? "Team Member" },
              { header: "Start Time", cell: ({ row }) => new Date(row.original.startTime).toLocaleString() },
              { header: "End Time", cell: ({ row }) => new Date(row.original.endTime).toLocaleString() },
              { header: "Status", cell: ({ row }) => <StatusChip status={row.original.status} /> }
            ]}
          />
        </Section>
      </section>
    </>
  );
}
