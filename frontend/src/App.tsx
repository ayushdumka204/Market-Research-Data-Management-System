import { useEffect, useState } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  LayoutDashboard,
  FolderKanban,
  ClipboardList,
  Database,
  FileChartColumn,
  Settings as SettingsIcon,
  Sun,
  Moon,
  Bell,
  Search,
  Menu,
  LogOut,
  ChevronDown,
  Command,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { api, clearSession, getToken, setSession } from "./services/api";
import type { User } from "./types";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import SurveyData from "./pages/SurveyData";
import DataRecords from "./pages/DataRecords";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
type NavItem = readonly [string, string, LucideIcon];

const nav: readonly { label: string; items: readonly NavItem[] }[] = [
  {
    label: "Overview",
    items: [
      ["Dashboard", "/", LayoutDashboard],
      ["Projects", "/projects", FolderKanban],
      ["Survey data", "/surveys", ClipboardList],
      ["Data records", "/records", Database],
      ["Reports", "/reports", FileChartColumn],
    ] as const,
  },
  {
    label: "Workspace",
    items: [["Settings", "/settings", SettingsIcon]] as const,
  },
];
export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    try {
      return JSON.parse(localStorage.getItem("nexgen_user") || "null");
    } catch {
      return null;
    }
  });
  const [dark, setDark] = useState(
    localStorage.getItem("nexgen_theme") === "dark",
  );
  const [mobile, setMobile] = useState(false);
  const [query, setQuery] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("nexgen_theme", dark ? "dark" : "light");
  }, [dark]);
  useEffect(() => {
    if (getToken() && !user)
      api<{ user: User }>("/auth/me")
        .then((d) => setUser(d.user))
        .catch(() => {
          clearSession();
          setUser(null);
        });
  }, []);
  async function login(email: string, password: string) {
    const d = await api<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setSession(d.token, d.user);
    setUser(d.user);
  }
  function logout() {
    clearSession();
    setUser(null);
    navigate("/login");
  }
  if (!user)
    return (
      <Routes>
        <Route path="/login" element={<Login onLogin={login} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  const current =
    nav.flatMap((g) => g.items).find((i) => i[1] === location.pathname)?.[0] ||
    "Dashboard";
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobile ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">
            <Command size={22} />
          </div>
          <div>
            <div className="brand-name">
              NexGen<span>.</span>
            </div>
            <div className="brand-caption">RESEARCH WORKSPACE</div>
          </div>
          <button
            className="icon-btn mobile-close"
            onClick={() => setMobile(false)}
          >
            ×
          </button>
        </div>
        <div className="workspace-switch">
          <div className="workspace-avatar">N</div>
          <div className="workspace-copy">
            <strong>NexGen Market Research</strong>
            <span>Internal workspace</span>
          </div>
          <ChevronDown size={15} />
        </div>
        <nav className="nav-area">
          {nav.map((group) => (
            <div className="nav-group" key={group.label}>
              <div className="nav-label">{group.label}</div>
              {group.items.map(([label, path, Icon]) => (
                <button
                  key={path}
                  onClick={() => {
                    navigate(path);
                    setMobile(false);
                  }}
                  className={`nav-link ${location.pathname === path ? "active" : ""}`}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                  {label === "Projects" && <span className="nav-dot" />}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="security-note">
            <ShieldCheck size={17} />
            <div>
              <strong>Workspace protected</strong>
              <span>Role-based access enabled</span>
            </div>
          </div>
          <button className="profile-row" onClick={logout}>
            <div className="avatar">{user.name.slice(0, 1).toUpperCase()}</div>
            <div className="profile-info">
              <strong>{user.name}</strong>
              <span>
                {user.role === "admin" ? "Administrator" : "Research team"}
              </span>
            </div>
            <LogOut size={16} />
          </button>
        </div>
      </aside>
      {mobile && (
        <button
          aria-label="Close menu"
          className="mobile-scrim"
          onClick={() => setMobile(false)}
        />
      )}
      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-btn mobile-menu"
              onClick={() => setMobile(true)}
            >
              <Menu size={20} />
            </button>
            <div className="breadcrumbs">
              <span>Workspace</span>
              <span className="crumb-slash">/</span>
              <strong>{current}</strong>
            </div>
          </div>
          <div className="topbar-actions">
            <label className="global-search">
              <Search size={16} />
              <input
                placeholder="Search workspace…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" &&
                  navigate("/records?search=" + encodeURIComponent(query))
                }
              />
              <kbd>↵</kbd>
            </label>
            <button
              className="icon-btn theme-toggle"
              title="Toggle theme"
              onClick={() => setDark((v) => !v)}
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="icon-btn notification-btn" title="Notifications">
              <Bell size={18} />
              <i />
            </button>
            <div className="top-avatar">
              {user.name.slice(0, 1).toUpperCase()}
            </div>
          </div>
        </header>
        <div className="page-content">
          <Routes>
            <Route path="/" element={<Dashboard user={user} />} />
            <Route path="/projects" element={<Projects user={user} />} />
            <Route path="/surveys" element={<SurveyData user={user} />} />
            <Route path="/records" element={<DataRecords user={user} />} />
            <Route path="/reports" element={<Reports user={user} />} />
            <Route
              path="/settings"
              element={<Settings user={user} dark={dark} setDark={setDark} />}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
        <footer className="app-footer">
          <span>
            © {new Date().getFullYear()} NexGen Market Research Services
          </span>
          <span>
            <i className="online-dot" /> All systems operational
          </span>
        </footer>
      </main>
    </div>
  );
}
