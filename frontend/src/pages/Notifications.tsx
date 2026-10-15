import { useEffect, useState } from "react";
import { Bell, CheckCheck, RefreshCw } from "lucide-react";
import { api } from "../services/api";
import PageTitle from "../components/layout/PageTitle";
import EmptyState from "../components/ui/EmptyState";
export default function Notifications() {
  const [items, setItems] = useState<any[]>([]),
    [error, setError] = useState("");
  async function load() {
    try {
      setItems(await api<any[]>("/notifications"));
      setError("");
    } catch (e: any) {
      setError(e.message);
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function read(id: number) {
    try {
      await api(`/notifications/${id}/read`, { method: "POST" });
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  }
  async function readAll() {
    try {
      await api("/notifications/read-all", { method: "POST" });
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  }
  return (
    <>
      <PageTitle
        title="Notifications"
        description="Stay on top of assignments, reviews, deadlines and project activity."
        actions={
          <>
            <button className="button secondary" onClick={load}>
              <RefreshCw size={15} /> Refresh
            </button>
            <button className="button primary" onClick={readAll}>
              <CheckCheck size={15} /> Mark all read
            </button>
          </>
        }
      />
      {error && <div className="error-banner">{error}</div>}
      <section className="surface notification-list">
        {items.map((n) => (
          <article
            key={n.id}
            className={n.is_read ? "notification read" : "notification"}
          >
            <div className="notification-icon">
              <Bell size={18} />
            </div>
            <div className="notification-copy">
              <b>{n.title}</b>
              <p>{n.message}</p>
              <small>
                {n.created_at
                  ? new Date(n.created_at).toLocaleString("en-IN")
                  : "Recently"}
              </small>
            </div>
            {!n.is_read && (
              <button
                className="button secondary small"
                onClick={() => read(n.id)}
              >
                Mark read
              </button>
            )}
          </article>
        ))}
        {!items.length && (
          <EmptyState
            title="You're all caught up"
            description="Project assignments and review alerts will appear here."
          />
        )}
      </section>
    </>
  );
}
