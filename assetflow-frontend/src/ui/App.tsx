import { lazy, Suspense, FormEvent, useEffect, useState, useRef } from "react";
import { Command, LogOut, Menu } from "lucide-react";
import { Command as Cmdk } from "cmdk";
import { toast } from "sonner";

import { toastApiError } from "../lib/api";
import { navItems, visibleNav } from "../lib/navigation";
import { Role } from "../lib/types";
import { useAuth } from "../state/auth";
import { useTheme } from "../state/theme";
import { Button, Skeleton, TextField } from "./components";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

const Dashboard = lazy(() => import("../screens/Dashboard"));
const Organization = lazy(() => import("../screens/Organization"));
const Assets = lazy(() => import("../screens/Assets"));
const AllocationTransfer = lazy(() => import("../screens/AllocationTransfer"));
const BookingScreen = lazy(() => import("../screens/BookingScreen"));
const Maintenance = lazy(() => import("../screens/Maintenance"));
const Audit = lazy(() => import("../screens/Audit"));
const Reports = lazy(() => import("../screens/Reports"));
const Notifications = lazy(() => import("../screens/Notifications"));
const Settings = lazy(() => import("../screens/Settings"));

const usePath = () => {
  const [path, setPath] = useState(() => (window.location.pathname === "/" ? "/dashboard" : window.location.pathname));
  useEffect(() => {
    const sync = () => setPath(window.location.pathname === "/" ? "/dashboard" : window.location.pathname);
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);
  return [
    path,
    (next: string) => {
      window.history.pushState(null, "", next);
      window.dispatchEvent(new PopStateEvent("popstate"));
    },
  ] as const;
};

export const App = () => {
  const { user } = useAuth();
  const [path, navigate] = usePath();

  useEffect(() => {
    if (!user && path !== "/login") navigate("/login");
    if (user && path === "/login") navigate("/dashboard");
  }, [navigate, path, user]);

  if (!user || path === "/login") return <AuthScreen onDone={() => navigate("/dashboard")} />;

  const nav = visibleNav(user.role);
  const active = nav.find((item) => item.path === path) ?? nav[0];
  if (!active) return <AuthScreen onDone={() => navigate("/dashboard")} />;
  if (!active.roles.includes(user.role)) {
    navigate(nav[0].path);
    return null;
  }

  return (
    <div className="app-shell">
      <Sidebar path={path} navigate={navigate} role={user.role} />
      <main className="main">
        <Topbar path={path} navigate={navigate} />
        <section className="content">
          <Suspense fallback={<Skeleton lines={5} />}>
            <RouteView path={path} role={user.role} navigate={navigate} />
          </Suspense>
        </section>
      </main>
    </div>
  );
};

const Sidebar = ({ path, navigate, role }: { path: string; navigate: (path: string) => void; role: Role }) => {
  const { user } = useAuth();
  const navRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.from(".nav button", {
      opacity: 0,
      x: -12,
      duration: 0.35,
      stagger: 0.04,
      ease: "power2.out",
    });
  }, { scope: navRef });

  return (
    <aside className="sidebar" ref={navRef}>
      <div className="brand">
        <span className="mark">AF</span>
        <span className="page-title">AssetFlow</span>
      </div>
      <nav className="nav" aria-label="Primary">
        {visibleNav(role).map((item) => (
          <button key={item.path} className={path === item.path ? "active" : ""} onClick={() => navigate(item.path)}>
            <item.icon size={16} />
            {item.label}
          </button>
        ))}
      </nav>
      <div style={{ marginTop: "auto", borderTop: "1px solid var(--border-subtle)", paddingTop: "16px", display: "flex", gap: "10px", alignItems: "center" }}>
        <div style={{ width: "32px", height: "32px", borderRadius: "var(--rounded-full)", background: "var(--signal-100)", color: "var(--signal-600)", display: "grid", placeItems: "center", fontWeight: 600, fontSize: "14px" }}>
          {user?.name.charAt(0)}
        </div>
        <div style={{ display: "grid", flex: 1, overflow: "hidden" }}>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink-900)", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>{user?.name}</span>
          <span className="mono" style={{ fontSize: "11px", color: "var(--ink-500)", textTransform: "capitalize" }}>{user?.role.replace("_", " ")}</span>
        </div>
      </div>
    </aside>
  );
};

const Topbar = ({ path, navigate }: { path: string; navigate: (path: string) => void }) => {
  const { user, logout } = useAuth();
  const { mode, setMode } = useTheme();
  const [palette, setPalette] = useState(false);
  return (
    <header className="topbar">
      <div className="actions">
        <Button className="mobile-menu">
          <Menu size={18} />
        </Button>
        <span className="muted" style={{ display: "flex", gap: "6px", alignItems: "center", fontSize: "14px" }}>
          <span>AssetFlow</span>
          <span style={{ color: "var(--ink-300)" }}>/</span>
          <span style={{ color: "var(--ink-700)", fontWeight: 500 }}>{navItems.find((item) => item.path === path)?.label}</span>
        </span>
      </div>
      <div className="actions">
        <Button onClick={() => setPalette(true)} style={{ minHeight: "36px" }}>
          <Command size={16} /> Command Palette (⌘K)
        </Button>
        <div style={{ display: "inline-flex", border: "1px solid var(--border)", borderRadius: "var(--rounded-default)", overflow: "hidden", background: "var(--surface)", height: "36px", padding: "2px" }}>
          {(["light", "dark", "system"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setMode(t)}
              style={{
                border: 0,
                background: mode === t ? "var(--signal-50)" : "transparent",
                color: mode === t ? "var(--signal-600)" : "var(--ink-500)",
                padding: "0 10px",
                fontSize: "12px",
                fontWeight: 600,
                minHeight: "unset",
                cursor: "pointer",
                textTransform: "capitalize",
                borderRadius: "var(--rounded-sm)"
              }}
            >
              {t}
            </button>
          ))}
        </div>
        <Button onClick={() => navigate("/notifications")} style={{ minHeight: "36px" }}>Notifications</Button>
        <Button onClick={() => logout().then(() => navigate("/login"))} style={{ minHeight: "36px" }}>
          <LogOut size={16} /> {user?.name}
        </Button>
      </div>
      {palette ? <CommandPalette onClose={() => setPalette(false)} navigate={navigate} /> : null}
    </header>
  );
};

const CommandPalette = ({ onClose, navigate }: { onClose: () => void; navigate: (path: string) => void }) => {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useGSAP(() => {
    gsap.fromTo(backdropRef.current, 
      { opacity: 0 }, 
      { opacity: 1, duration: 0.15, ease: "power2.out" }
    );
    gsap.fromTo(modalRef.current, 
      { opacity: 0, scale: 0.97, y: -10 }, 
      { opacity: 1, scale: 1, y: 0, duration: 0.22, ease: "power2.out" }
    );
  }, { scope: containerRef });

  return (
    <div ref={containerRef} style={{ display: "contents" }}>
      <button ref={backdropRef} className="drawer-backdrop" onClick={onClose} aria-label="Close command palette" />
      <div ref={modalRef} className="drawer" style={{ left: "50%", right: "auto", top: 80, height: "auto", transform: "translateX(-50%)", maxWidth: 640, borderRadius: "var(--rounded-lg)", border: "1px solid var(--border)", background: "var(--surface)", boxShadow: "var(--shadow-lg)", overflow: "hidden" }}>
        <Cmdk label="Command Palette" style={{ background: "transparent", color: "inherit", font: "inherit", display: "grid", gap: "8px" }}>
          <Cmdk.Input
            placeholder="Search screens..."
            value={search}
            onValueChange={setSearch}
            style={{ width: "100%", border: "1px solid var(--border)", borderRadius: "var(--rounded-default)", padding: "10px 12px", background: "var(--surface-sunken)", color: "var(--ink-900)", outline: "none" }}
            autoFocus
          />
          <Cmdk.List style={{ maxHeight: "300px", overflow: "auto", display: "grid", gap: "4px" }}>
            <Cmdk.Empty style={{ padding: "8px 12px", color: "var(--ink-500)", fontSize: "14px" }}>No screens found.</Cmdk.Empty>
            <Cmdk.Group heading="Navigation" style={{ display: "grid", gap: "2px" }}>
              {visibleNav(user?.role).map((item) => (
                <Cmdk.Item
                  key={item.path}
                  value={item.label}
                  onSelect={() => { navigate(item.path); onClose(); }}
                  style={{ padding: "10px var(--spacing-md)", display: "flex", gap: "10px", alignItems: "center", cursor: "pointer", borderRadius: "var(--rounded-default)", transition: "var(--motion-micro)" }}
                >
                  <item.icon size={16} />
                  <span style={{ fontSize: "14px", fontWeight: 500 }}>{item.label}</span>
                </Cmdk.Item>
              ))}
            </Cmdk.Group>
          </Cmdk.List>
        </Cmdk>
      </div>
    </div>
  );
};

const RouteView = ({ path, role, navigate }: { path: string; role: Role; navigate: (path: string) => void }) => {
  if (path === "/dashboard") return <Dashboard role={role} navigate={navigate} />;
  if (path === "/organization") return <Organization />;
  if (path === "/assets") return <Assets />;
  if (path === "/allocation-transfer") return <AllocationTransfer />;
  if (path === "/booking") return <BookingScreen />;
  if (path === "/maintenance") return <Maintenance />;
  if (path === "/audit") return <Audit />;
  if (path === "/reports") return <Reports />;
  if (path === "/notifications") return <Notifications />;
  if (path === "/settings") return <Settings />;
  return <div className="card">Use the sidebar to choose an AssetFlow workspace.</div>;
};

const AuthScreen = ({ onDone }: { onDone: () => void }) => {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const cardRef = useRef<HTMLFormElement>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      if (mode === "signup") {
        await signup(form);
        toast.success("Account created. You can now log in.");
        setMode("login");
      } else {
        await login({ email: form.email, password: form.password });
        onDone();
      }
    } catch (error) {
      toastApiError(error);
    }
  };

  useGSAP(() => {
    gsap.fromTo(".auth-animate",
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: 0.3, stagger: 0.04, ease: "power2.out" }
    );
  }, [mode]);

  return (
    <main className="auth-page">
      <form ref={cardRef} className="auth-card" onSubmit={submit}>
        <div className="auth-animate" style={{ textAlign: "center", marginBottom: 12 }}>
          <div className="mark shadow-md" style={{ margin: "0 auto 16px", width: "48px", height: "48px", fontSize: "18px", background: "var(--signal-500)", color: "#FFFFFF", display: "grid", placeItems: "center", borderRadius: "var(--rounded-full)" }}>AF</div>
          <h1 className="page-title" style={{ fontSize: "32px", fontFamily: '"Instrument Serif", serif', fontWeight: 400, letterSpacing: "-0.03em" }}>
            AssetFlow <span style={{ fontFamily: "Inter, sans-serif", fontSize: "18px", color: "var(--ink-500)", fontWeight: 500, letterSpacing: "normal", marginLeft: "4px" }}>— {mode}</span>
          </h1>
        </div>

        <div className="auth-animate grid" style={{ gap: "14px" }}>
          {mode === "signup" ? (
            <TextField 
              label="Name" 
              placeholder="Your Name"
              value={form.name} 
              onChange={(event) => setForm({ ...form, name: event.target.value })} 
            />
          ) : null}
          <TextField 
            label="Email" 
            placeholder="name@company.com" 
            value={form.email} 
            onChange={(event) => setForm({ ...form, email: event.target.value })} 
          />
          <div>
            <TextField 
              label="Password" 
              type="password" 
              placeholder="••••••••"
              value={form.password} 
              onChange={(event) => setForm({ ...form, password: event.target.value })} 
            />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
              <button 
                type="button" 
                style={{ border: 0, background: "none", color: "var(--signal-500)", fontSize: "12px", padding: 0, minHeight: "unset", cursor: "pointer", fontWeight: 500 }} 
                onClick={() => toast.info("Password reset is not enabled yet.")}
              >
                Forgot password
              </button>
            </div>
          </div>
        </div>

        <div className="auth-animate" style={{ marginTop: 8 }}>
          <Button variant="primary" style={{ width: "100%" }}>
            {mode === "login" ? "Log In" : "Create Account"}
          </Button>
        </div>

        <div className="auth-animate divider-container" style={{ position: "relative", textAlign: "center", margin: "16px 0" }}>
          <hr style={{ border: 0, borderTop: "1px solid var(--border)", margin: 0 }} />
          {mode === "login" ? (
            <span style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", background: "var(--surface)", padding: "0 12px", fontSize: "12px", color: "var(--ink-400)", fontWeight: 500, whiteSpace: "nowrap" }}>
              New here?
            </span>
          ) : null}
        </div>

        {mode === "login" ? (
          <div className="auth-animate" style={{ display: "grid", gap: "12px" }}>
            <p className="muted" style={{ textAlign: "center", fontSize: "12px", margin: 0, lineHeight: 1.45 }}>
              Sign up creates an employee account — admin roles assigned later
            </p>
            <Button type="button" style={{ width: "100%" }} onClick={() => setMode("signup")}>
              Create Account
            </Button>
          </div>
        ) : (
          <div className="auth-animate">
            <Button type="button" style={{ width: "100%" }} onClick={() => setMode("login")}>
              Back to Login
            </Button>
          </div>
        )}
      </form>
    </main>
  );
};
