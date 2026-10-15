import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  FolderKanban,
  ClipboardCheck,
  Activity,
  FileCheck2,
  Plus,
  ArrowRight,
  Clock3,
  Download,
  Sparkles,
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import { api } from "../services/api";
import type { DashboardStats, User } from "../types";
export default function Dashboard({ user }: { user: User }) {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  useEffect(() => {
    api<DashboardStats>("/dashboard")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);
  const stats = [
    {
      label: "Total projects",
      value: data?.total_projects ?? "—",
      icon: FolderKanban,
      tone: "blue",
      note: "Across all research work",
    },
    {
      label: "Active projects",
      value: data?.active_projects ?? "—",
      icon: Activity,
      tone: "green",
      note: "Currently in progress",
    },
    {
      label: "Survey responses",
      value: data?.total_responses ?? "—",
      icon: ClipboardCheck,
      tone: "violet",
      note: "Responses captured",
    },
    {
      label: "Completed projects",
      value: data?.completed_projects ?? "—",
      icon: FileCheck2,
      tone: "amber",
      note: "Ready for reporting",
    },
  ];
  return (
    <>
      <PageHeader
        eyebrow="YOUR RESEARCH, AT A GLANCE"
        title={`Good morning, ${user.name.split(" ")[0]}.`}
        description="A clear view of what’s moving, what’s finished, and where your team is focused."
        actions={
          <button
            className="btn btn-primary"
            onClick={() => navigate("/projects?new=1")}
          >
            <Plus size={17} /> New project
          </button>
        }
      />
      {error && <div className="error-box">{error}</div>}
      <div className="stats-grid">
        {stats.map((s) => (
          <div className="stat-card" key={s.label}>
            <div className="stat-top">
              <span>{s.label}</span>
              <span className={`stat-icon ${s.tone}`}>
                <s.icon size={18} />
              </span>
            </div>
            <div className="stat-number">{s.value}</div>
            <div className="stat-foot">
              <span>{s.note}</span>
              <ArrowUpRight size={15} />
            </div>
          </div>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="panel projects-panel">
          <div className="panel-header">
            <div>
              <h2>Recent projects</h2>
              <p>Latest work across your research pipeline</p>
            </div>
            <button
              className="text-button"
              onClick={() => navigate("/projects")}
            >
              View all <ArrowRight size={15} />
            </button>
          </div>
          {!data?.recent_projects?.length ? (
            <div className="empty-state">
              <div className="empty-icon">
                <FolderKanban size={22} />
              </div>
              <strong>Your project list starts here</strong>
              <p>
                Create a research project to keep briefs, fieldwork and findings
                together.
              </p>
              <button
                className="btn btn-secondary"
                onClick={() => navigate("/projects?new=1")}
              >
                <Plus size={16} /> Create first project
              </button>
            </div>
          ) : (
            <div className="project-list">
              {data.recent_projects.map((p) => (
                <div className="project-row" key={p.id}>
                  <div className="project-symbol">
                    {p.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="project-main">
                    <strong>{p.name}</strong>
                    <span>
                      {p.client || "Internal research"} ·{" "}
                      {p.industry || "General"}
                    </span>
                    <div className="mini-progress">
                      <i
                        style={{
                          width:
                            p.status === "completed"
                              ? "100%"
                              : p.status === "active"
                                ? "62%"
                                : p.status === "on_hold"
                                  ? "25%"
                                  : "12%",
                        }}
                      />
                    </div>
                  </div>
                  <div className="project-meta">
                    <StatusBadge status={p.status} />
                    <span>{p.response_count ?? 0} responses</span>
                  </div>
                  <button
                    className="icon-btn row-open"
                    title="Open project"
                    onClick={() => navigate("/projects")}
                  >
                    <ArrowUpRight size={17} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
        <section className="panel activity-panel">
          <div className="panel-header">
            <div>
              <h2>Workspace pulse</h2>
              <p>A quick look at your data</p>
            </div>
            <span className="live-label">
              <i /> LIVE
            </span>
          </div>
          <div className="pulse-visual">
            <div className="pulse-orbit orbit-one" />
            <div className="pulse-orbit orbit-two" />
            <div className="pulse-core">
              <Sparkles size={24} />
            </div>
          </div>
          <div className="pulse-copy">
            <strong>Research in one place.</strong>
            <p>
              Projects, responses and reporting are connected so your team can
              spend less time chasing files.
            </p>
          </div>
          <div className="quick-links">
            <button onClick={() => navigate("/surveys")}>
              <span className="quick-icon mint">
                <ClipboardCheck size={17} />
              </span>
              <span>
                <strong>Capture responses</strong>
                <small>Add newly collected survey data</small>
              </span>
              <ArrowRight size={16} />
            </button>
            <button onClick={() => navigate("/records")}>
              <span className="quick-icon blue">
                <Download size={17} />
              </span>
              <span>
                <strong>Manage data records</strong>
                <small>Search, import or export CSV</small>
              </span>
              <ArrowRight size={16} />
            </button>
          </div>
        </section>
      </div>
      <section className="panel bottom-note">
        <div className="note-icon">
          <Clock3 size={19} />
        </div>
        <div>
          <strong>Keep the research trail clear</strong>
          <p>
            Use consistent project names and respondent codes to make reporting
            more reliable.
          </p>
        </div>
        <button className="text-button" onClick={() => navigate("/reports")}>
          Explore reports <ArrowRight size={15} />
        </button>
      </section>
    </>
  );
}
