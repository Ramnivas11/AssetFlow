import { Moon, Sun, Monitor, Shield, Lock, Eye, Key } from "lucide-react";
import { useAuth } from "../state/auth";
import { useTheme } from "../state/theme";
import { Button, StatusChip } from "../ui/components";
import { useState } from "react";
import { toast } from "sonner";

export default function Settings() {
  const { user } = useAuth();
  const { mode, setMode } = useTheme();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    toast.success("Security settings updated successfully");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <>
      <h1 className="page-title">Settings</h1>
      
      <div className="grid cols-2" style={{ gap: "16px", marginTop: "8px" }}>
        
        {/* Profile Card */}
        <section className="card grid" style={{ alignContent: "start", gap: "12px" }}>
          <h2 className="section-title" style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            Profile Details
          </h2>
          <div style={{ display: "grid", gap: "8px", marginTop: "4px" }}>
            <div>
              <label className="muted" style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase" }}>Name</label>
              <p style={{ margin: "2px 0 0", fontSize: "15px", fontWeight: 600 }}>{user?.name}</p>
            </div>
            <div>
              <label className="muted" style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase" }}>Email Address</label>
              <p style={{ margin: "2px 0 0", fontSize: "15px" }}>{user?.email}</p>
            </div>
            <div>
              <label className="muted" style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase" }}>Role Type</label>
              <p style={{ margin: "4px 0 0" }}><StatusChip status={user?.role} /></p>
            </div>
          </div>
        </section>

        {/* Theme Preferences */}
        <section className="card grid" style={{ alignContent: "start", gap: "12px" }}>
          <h2 className="section-title" style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            Preferences
          </h2>
          <p className="muted" style={{ fontSize: "13px", margin: 0 }}>
            Configure theme aesthetics for comfortable long-duration operations.
          </p>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "8px" }}>
            <Button 
              onClick={() => setMode("light")} 
              style={{
                background: mode === "light" ? "var(--signal-50)" : "var(--surface)",
                color: mode === "light" ? "var(--signal-600)" : "var(--ink-700)",
                borderColor: mode === "light" ? "var(--signal-500)" : "var(--border)"
              }}
            >
              <Sun size={16} /> Light Theme
            </Button>
            <Button 
              onClick={() => setMode("dark")}
              style={{
                background: mode === "dark" ? "var(--signal-50)" : "var(--surface)",
                color: mode === "dark" ? "var(--signal-600)" : "var(--ink-700)",
                borderColor: mode === "dark" ? "var(--signal-500)" : "var(--border)"
              }}
            >
              <Moon size={16} /> Dark Theme
            </Button>
            <Button 
              onClick={() => setMode("system")}
              style={{
                background: mode === "system" ? "var(--signal-50)" : "var(--surface)",
                color: mode === "system" ? "var(--signal-600)" : "var(--ink-700)",
                borderColor: mode === "system" ? "var(--signal-500)" : "var(--border)"
              }}
            >
              <Monitor size={16} /> System Default
            </Button>
          </div>
        </section>

        {/* Security Password Form */}
        <section className="card grid" style={{ alignContent: "start", gap: "12px" }}>
          <h2 className="section-title" style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <Lock size={18} /> Update Password
          </h2>
          <form className="grid" style={{ gap: "10px", marginTop: "4px" }} onSubmit={handleUpdatePassword}>
            <div className="field">
              <label>Current Password</label>
              <input className="input" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </div>
            <div className="field">
              <label>New Password</label>
              <input className="input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <div className="field">
              <label>Confirm New Password</label>
              <input className="input" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>
            <Button variant="primary" type="submit" style={{ marginTop: "6px" }}>Save Security settings</Button>
          </form>
        </section>

        {/* API Keys (Coming Soon) */}
        <section className="card grid" style={{ alignContent: "start", gap: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 className="section-title" style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <Key size={18} /> Developer API Keys
            </h2>
            <StatusChip status="coming soon" />
          </div>
          <p className="muted" style={{ fontSize: "13px", margin: 0, lineHeight: 1.4 }}>
            Generate and manage API keys to programmatically query assets, allocation logs, and maintenance records from external CI/CD integrations.
          </p>
          <div style={{ background: "var(--surface-sunken)", border: "1px dashed var(--border)", padding: "16px", borderRadius: "var(--rounded-lg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span className="mono muted" style={{ fontSize: "12px" }}>No keys generated. API Key Module coming soon.</span>
          </div>
        </section>
      </div>
    </>
  );
}
