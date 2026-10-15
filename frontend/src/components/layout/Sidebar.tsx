import {
  BarChart3,
  ClipboardList,
  Database,
  FolderKanban,
  LayoutDashboard,
  Settings,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Users,
} from "lucide-react";
import type { Role } from "../../types";
const nav = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Projects", icon: FolderKanban },
  { label: "Tasks & Daily Updates", icon: ClipboardList },
  { label: "Project Files & Data", icon: Database },
  { label: "Team & Workload", icon: Users },
  { label: "Survey Data", icon: ClipboardList },
  { label: "Data Records", icon: Database },
  { label: "Reports", icon: BarChart3 },
  { label: "Team & Users", icon: Users, admin: true },
  { label: "Settings", icon: Settings },
];
export default function Sidebar({
  page,
  onNavigate,
  user,
  onLogout,
  collapsed,
  onToggle,
}: {
  page: string;
  onNavigate: (p: string) => void;
  user: any;
  onLogout: () => void;
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="brand">
        <div className="brand-mark">N</div>
        {!collapsed && (
          <div>
            <b>NexGen</b>
            <small>RESEARCH OPERATIONS</small>
          </div>
        )}
      </div>
      <div className="nav-caption">{!collapsed && "WORKSPACE"}</div>
      <nav>
        {nav
          .filter((n) => !n.admin || user?.role === "admin")
          .map((n) => (
            <button
              key={n.label}
              className={`nav-item ${page === n.label ? "active" : ""}`}
              onClick={() => onNavigate(n.label)}
              title={n.label}
            >
              <n.icon size={19} />
              {!collapsed && <span>{n.label}</span>}
            </button>
          ))}
      </nav>
      <div className="sidebar-bottom">
        <button className="nav-item" onClick={onToggle}>
          {collapsed ? (
            <PanelLeftOpen size={19} />
          ) : (
            <PanelLeftClose size={19} />
          )}
          {!collapsed && <span>Collapse sidebar</span>}
        </button>
        <div className="profile">
          <div className="avatar">{(user?.name || "U")[0]}</div>
          {!collapsed && (
            <div className="profile-copy">
              <b>{user?.name}</b>
              <small>{user?.role}</small>
            </div>
          )}
          <button className="logout" onClick={onLogout} title="Sign out">
            <LogOut size={17} />
          </button>
        </div>
      </div>
    </aside>
  );
}
