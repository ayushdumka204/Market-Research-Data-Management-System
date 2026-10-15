import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  Target,
  TrendingUp,
  ClipboardList,
} from "lucide-react";
import { api } from "../services/api";
import type { Project, Task } from "../types";
import PageTitle from "../components/layout/PageTitle";
import StatusBadge from "../components/ui/StatusBadge";
import EmptyState from "../components/ui/EmptyState";
import { dateLabel } from "../utils/format";
export default function Dashboard({
  onNavigate,
}: {
  onNavigate: (p: string) => void;
}) {
  const [projects, setProjects] = useState<Project[]>([]),
    [tasks, setTasks] = useState<Task[]>([]),
    [surveys, setSurveys] = useState<any[]>([]),
    [records, setRecords] = useState<any[]>([]),
    [error, setError] = useState("");
  useEffect(() => {
    Promise.all([
      api<Project[]>("/projects"),
      api<Task[]>("/tasks"),
      api<any[]>("/surveys"),
      api<any[]>("/records"),
    ])
      .then(([p, t, s, r]) => {
        setProjects(p);
        setTasks(t);
        setSurveys(s);
        setRecords(r);
      })
      .catch((e) => setError(e.message));
  }, []);
  const metrics = [
    {
      label: "Active projects",
      value: projects.filter((p) => p.status === "ongoing").length,
      sub: "Currently in progress",
      icon: BriefcaseBusiness,
    },
    {
      label: "Survey target",
      value: surveys
        .reduce((n, s) => n + Number(s.response_target || 0), 0)
        .toLocaleString("en-IN"),
      sub: "Planned responses",
      icon: Target,
    },
    {
      label: "Tasks to review",
      value: tasks.filter((t) => ["submitted", "in_review"].includes(t.status))
        .length,
      sub: "Awaiting review",
      icon: Clock3,
    },
    {
      label: "Approved tasks",
      value: tasks.filter((t) => t.status === "approved").length,
      sub: "Reviewed deliverables",
      icon: CheckCircle2,
    },
  ];
  return (
    <>
      <PageTitle
        title="Dashboard"
        description="A clear view of research delivery, team activity and priorities."
        actions={
          <button
            className="button secondary"
            onClick={() => onNavigate("Reports")}
          >
            View reports <ArrowUpRight size={16} />
          </button>
        }
      />
      {error && <div className="error-banner">{error}</div>}
      <div className="metric-grid">
        {metrics.map((m) => (
          <article className="metric-card" key={m.label}>
            <div className="metric-top">
              <span>{m.label}</span>
              <div className="metric-icon">
                <m.icon size={18} />
              </div>
            </div>
            <strong>{m.value}</strong>
            <small>
              <TrendingUp size={13} />
              {m.sub}
            </small>
          </article>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="surface">
          <div className="section-head">
            <div>
              <h2>Project portfolio</h2>
              <p>Recent work across the workspace</p>
            </div>
            <button
              className="text-button"
              onClick={() => onNavigate("Projects")}
            >
              All projects <ArrowUpRight size={15} />
            </button>
          </div>
          {projects.slice(0, 5).map((p) => {
            const progress = p.sample_target
              ? Math.min(
                  100,
                  Math.round((p.sample_completed / p.sample_target) * 100),
                )
              : 0;
            return (
              <div className="project-line" key={p.id}>
                <div className="project-symbol">
                  <BriefcaseBusiness size={17} />
                </div>
                <div className="project-info">
                  <b>{p.name}</b>
                  <small>
                    {p.client || "Research project"} · Due{" "}
                    {dateLabel(p.due_date)}
                  </small>
                  <div className="progress-track">
                    <i style={{ width: `${progress}%` }} />
                  </div>
                </div>
                <div className="project-meta">
                  <StatusBadge status={p.status} />
                  <small>{progress}%</small>
                </div>
              </div>
            );
          })}
          {!projects.length && (
            <EmptyState
              title="No projects yet"
              description="Create a project to start tracking delivery."
            />
          )}
        </section>
        <section className="surface">
          <div className="section-head">
            <div>
              <h2>Recent task activity</h2>
              <p>Daily updates and review status</p>
            </div>
            <button
              className="text-button"
              onClick={() => onNavigate("Data Records")}
            >
              Data records <ArrowUpRight size={15} />
            </button>
          </div>
          {tasks.slice(0, 6).map((t) => (
            <div className="task-line" key={t.id}>
              <div className="task-dot" />
              <div className="task-info">
                <b>{t.title}</b>
                <small>
                  {t.work_date ? dateLabel(t.work_date) : "No work date"} ·{" "}
                  {t.project_name || "Research project"}
                </small>
              </div>
              <StatusBadge status={t.status} />
            </div>
          ))}
          {!tasks.length && (
            <EmptyState
              title="No task activity"
              description="Assigned tasks will show up here."
            />
          )}
          <div className="mini-stat-row">
            <span>
              <ClipboardList size={15} /> Survey instruments
            </span>
            <b>{surveys.length}</b>
            <span>
              <Target size={15} /> Data record sets
            </span>
            <b>{records.length}</b>
          </div>
        </section>
      </div>
    </>
  );
}
