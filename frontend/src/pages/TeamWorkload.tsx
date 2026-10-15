import { useEffect, useState } from "react";
import { Users, UserCheck, ClipboardList, Save } from "lucide-react";
import { api, body } from "../services/api";
import type { Project, User, Task } from "../types";
import PageTitle from "../components/layout/PageTitle";
import StatusBadge from "../components/ui/StatusBadge";
import EmptyState from "../components/ui/EmptyState";
export default function TeamWorkload({ user }: { user: any }) {
  const [projects, setProjects] = useState<Project[]>([]),
    [members, setMembers] = useState<User[]>([]),
    [tasks, setTasks] = useState<Task[]>([]),
    [selected, setSelected] = useState(""),
    [chosen, setChosen] = useState<string[]>([]),
    [error, setError] = useState(""),
    [ok, setOk] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    try {
      const [p, t] = await Promise.all([
        api<Project[]>("/projects"),
        api<Task[]>("/tasks"),
      ]);
      setProjects(p);
      setTasks(t);
      if (user.role !== "team") {
        const m = await api<User[]>("/users?role=team");
        setMembers(m);
      }
      setError("");
    } catch (e: any) {
      setError(e.message);
    }
  }
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    const p = projects.find((p) => String(p.id) === selected);
    setChosen((p?.team || []).map((m: any) => String(m.id || m._id || m)));
  }, [selected, projects]);
  async function save() {
    if (!selected) return;
    setBusy(true);
    setOk("");
    try {
      await api(`/projects/${selected}/team`, {
        method: "POST",
        body: body({ member_ids: chosen }),
      });
      setOk("Project team saved.");
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const selectedProject = projects.find((p) => String(p.id) === selected);
  return (
    <>
      <PageTitle
        title="Team & Workload"
        description="Assign project members and understand task load across the team."
        actions={
          user.role !== "team" && (
            <button
              className="button primary"
              disabled={!selected || busy}
              onClick={save}
            >
              <Save size={16} />
              {busy ? "Saving…" : "Save team assignment"}
            </button>
          )
        }
      />
      {error && <div className="error-banner">{error}</div>}
      {ok && <div className="success-banner">{ok}</div>}
      <section className="surface team-assignment">
        <div className="section-head">
          <div>
            <h2>Project team assignment</h2>
            <p>Only active team-member accounts can be assigned.</p>
          </div>
          <Users size={20} />
        </div>
        <label className="field">
          <span>Select project</span>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="">Choose a project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        {selectedProject && (
          <>
            <div className="assignment-meta">
              <span>Project leader</span>
              <b>{selectedProject.leader_name || "Unassigned"}</b>
              <span>Current members</span>
              <b>{selectedProject.team?.length || 0}</b>
            </div>
            {user.role === "team" ? (
              <p className="subtitle">
                Your role is read-only for team assignments.
              </p>
            ) : (
              <div className="member-pool">
                {members.map((m) => (
                  <label className="member-option" key={m.id}>
                    <input
                      type="checkbox"
                      checked={chosen.includes(String(m.id))}
                      onChange={(e) =>
                        setChosen((prev) =>
                          e.target.checked
                            ? [...prev, String(m.id)]
                            : prev.filter((id) => id !== String(m.id)),
                        )
                      }
                    />
                    <div className="avatar">
                      {m.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <b>{m.name}</b>
                      <small>{m.email}</small>
                    </div>
                    <span className="role-pill">Team</span>
                  </label>
                ))}
                {!members.length && (
                  <EmptyState
                    title="No active team members"
                    description="An administrator must create team accounts first."
                  />
                )}
              </div>
            )}
          </>
        )}
      </section>
      <section className="surface workload-section">
        <div className="section-head">
          <div>
            <h2>Task workload</h2>
            <p>Open tasks by assigned member</p>
          </div>
          <ClipboardList size={20} />
        </div>
        {members.map((m) => {
          const assigned = tasks.filter(
              (t) => String(t.assigned_to) === String(m.id),
            ),
            open = assigned.filter((t) => t.status !== "approved").length,
            done = assigned.length - open;
          return (
            <div className="workload-row" key={m.id}>
              <div className="avatar">{m.name.slice(0, 1).toUpperCase()}</div>
              <div className="workload-name">
                <b>{m.name}</b>
                <small>{m.email}</small>
                <div className="progress-track">
                  <i
                    style={{
                      width:
                        (assigned.length ? (done / assigned.length) * 100 : 0) +
                        "%",
                    }}
                  />
                </div>
              </div>
              <div className="workload-count">
                <b>{open}</b>
                <small>open</small>
              </div>
              <div className="workload-count">
                <b>{done}</b>
                <small>approved</small>
              </div>
            </div>
          );
        })}
        {user.role === "team" && (
          <div className="notice">
            Your assignments and task updates are available in Tasks & Daily
            Updates.
          </div>
        )}
      </section>
    </>
  );
}
