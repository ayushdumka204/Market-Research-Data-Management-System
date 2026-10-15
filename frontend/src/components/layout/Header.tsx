import { Bell, Moon, Sun, Search } from "lucide-react";
import { initials } from "../../utils/format";
export default function Header({
  page,
  dark,
  onTheme,
  onNotifications,
  user,
}: {
  page: string;
  dark: boolean;
  onTheme: () => void;
  onNotifications: () => void;
  user: any;
}) {
  return (
    <header className="topbar">
      <div className="breadcrumb">
        <span>Workspace</span>
        <b>/</b>
        <strong>{page}</strong>
      </div>
      <div className="top-actions">
        <div className="global-search">
          <Search size={16} />
          <input
            placeholder="Search workspace…"
            aria-label="Search workspace"
          />
        </div>
        <button className="icon-btn" onClick={onTheme} title="Toggle theme">
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button
          className="icon-btn notification-btn"
          onClick={onNotifications}
          title="Notifications"
        >
          <Bell size={18} />
        </button>
        <div className="user-chip">
          <div className="avatar small-avatar">{initials(user?.name)}</div>
          <span>{user?.name}</span>
        </div>
      </div>
    </header>
  );
}
