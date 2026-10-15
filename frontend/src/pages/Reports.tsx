import { useEffect, useState } from "react";
import {
  Download,
  FileChartColumn,
  TrendingUp,
  ClipboardCheck,
  FolderKanban,
  CalendarDays,
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import { api } from "../services/api";
import type { Project, ResponseRecord, User } from "../types";
export default function Reports({ user }: { user: User }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [responses, setResponses] = useState<ResponseRecord[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    Promise.all([
      api<Project[]>("/projects"),
      api<ResponseRecord[]>("/responses"),
    ])
      .then(([p, r]) => {
        setProjects(p);
        setResponses(r);
      })
      .catch((e) => setError(e.message));
  }, []);
  const completed = projects.filter((p) => p.status === "completed").length;
  const active = projects.filter((p) => p.status === "active").length;
  const max = Math.max(1, ...projects.map((p) => p.response_count || 0));
  const channelMap = responses.reduce<Record<string, number>>((acc, r) => {
    const c = r.channel || "Unspecified";
    acc[c] = (acc[c] || 0) + 1;
    return acc;
  }, {});
  function exportSummary() {
    const lines = [
      [
        "Project ID",
        "Project name",
        "Client",
        "Industry",
        "Status",
        "Start date",
        "End date",
        "Responses",
      ],
      ...projects.map((p) => [
        p.id,
        p.name,
        p.client,
        p.industry,
        p.status,
        p.start_date,
        p.end_date,
        p.response_count || 0,
      ]),
    ].map((r) =>
      r.map((v) => '"' + String(v ?? "").replace(/"/g, '""') + '"').join(","),
    );
    const b = new Blob(["\ufeff" + lines.join("\r\n")], {
      type: "text/csv;charset=utf-8",
    });
    const u = URL.createObjectURL(b);
    const a = document.createElement("a");
    a.href = u;
    a.download = "nexgen-project-report.csv";
    a.click();
    URL.revokeObjectURL(u);
  }
  return (
    <>
      <PageHeader
        eyebrow="INSIGHTS & OUTPUTS"
        title="Reports"
        description="A clear operational summary of project progress and collected survey data."
        actions={
          <button className="btn btn-primary" onClick={exportSummary}>
            <Download size={16} /> Export project report
          </button>
        }
      />
      {error && <div className="error-box">{error}</div>}
      <div className="report-summary">
        <div className="report-summary-copy">
          <div className="eyebrow light">RESEARCH OPERATIONS REPORT</div>
          <h2>
            From fieldwork
            <br />
            to findings.
          </h2>
          <p>
            Use this overview to understand the shape of your current research
            portfolio and collected responses.
          </p>
          <div className="report-period">
            <CalendarDays size={15} /> Updated from live workspace data
          </div>
        </div>
        <div className="report-summary-graphic">
          <div className="graphic-ring">
            <div>
              <strong>{projects.length}</strong>
              <span>Projects</span>
            </div>
          </div>
          <div className="graphic-legend">
            <span>
              <i className="legend-blue" /> {active} active
            </span>
            <span>
              <i className="legend-green" /> {completed} completed
            </span>
            <span>
              <i className="legend-muted" />{" "}
              {projects.length - active - completed} other
            </span>
          </div>
        </div>
      </div>
      <div className="stats-grid report-stats">
        <div className="stat-card">
          <div className="stat-top">
            <span>Total responses</span>
            <span className="stat-icon blue">
              <ClipboardCheck size={18} />
            </span>
          </div>
          <div className="stat-number">{responses.length}</div>
          <div className="stat-foot">
            <span>Across all projects</span>
            <TrendingUp size={15} />
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-top">
            <span>Average responses</span>
            <span className="stat-icon green">
              <FileChartColumn size={18} />
            </span>
          </div>
          <div className="stat-number">
            {projects.length
              ? (responses.length / projects.length).toFixed(1)
              : "0"}
          </div>
          <div className="stat-foot">
            <span>Per project</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-top">
            <span>Projects with data</span>
            <span className="stat-icon violet">
              <FolderKanban size={18} />
            </span>
          </div>
          <div className="stat-number">
            {projects.filter((p) => (p.response_count || 0) > 0).length}
          </div>
          <div className="stat-foot">
            <span>At least one response</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-top">
            <span>Completion rate</span>
            <span className="stat-icon amber">
              <TrendingUp size={18} />
            </span>
          </div>
          <div className="stat-number">
            {projects.length
              ? Math.round((completed / projects.length) * 100)
              : 0}
            %
          </div>
          <div className="stat-foot">
            <span>Projects marked completed</span>
          </div>
        </div>
      </div>
      <div className="reports-grid">
        <section className="panel report-panel">
          <div className="panel-header">
            <div>
              <h2>Responses by project</h2>
              <p>Where collected data currently sits</p>
            </div>
          </div>
          {projects.length === 0 ? (
            <div className="empty-state compact">
              <strong>No project data to report</strong>
              <p>
                Create projects and add survey responses to populate this
                report.
              </p>
            </div>
          ) : (
            <div className="bar-list">
              {[...projects]
                .sort(
                  (a, b) => (b.response_count || 0) - (a.response_count || 0),
                )
                .slice(0, 8)
                .map((p) => (
                  <div className="bar-item" key={p.id}>
                    <div className="bar-label">
                      <span>{p.name}</span>
                      <strong>{p.response_count || 0}</strong>
                    </div>
                    <div className="bar-track">
                      <i
                        style={{
                          width: `${((p.response_count || 0) / max) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          )}
        </section>
        <section className="panel report-panel">
          <div className="panel-header">
            <div>
              <h2>Collection channels</h2>
              <p>How responses are being gathered</p>
            </div>
          </div>
          {Object.keys(channelMap).length === 0 ? (
            <div className="empty-state compact">
              <strong>No channel data yet</strong>
              <p>Channel summaries appear as survey responses are added.</p>
            </div>
          ) : (
            <div className="channel-list">
              {Object.entries(channelMap)
                .sort((a, b) => b[1] - a[1])
                .map(([name, count], i) => (
                  <div className="channel-row" key={name}>
                    <span className={`channel-number channel-${i % 4}`}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="channel-name">
                      <strong>{name}</strong>
                      <div className="bar-track">
                        <i
                          style={{
                            width: `${(count / Math.max(1, responses.length)) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                    <strong>{count}</strong>
                  </div>
                ))}
            </div>
          )}
        </section>
      </div>
      <section className="panel table-panel">
        <div className="panel-header report-table-head">
          <div>
            <h2>Project status register</h2>
            <p>Current project status and response counts</p>
          </div>
          <span className="result-count">{projects.length} projects</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Project</th>
                <th>Client</th>
                <th>Status</th>
                <th>Responses</th>
                <th>Target date</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id}>
                  <td>
                    <strong className="cell-primary">{p.name}</strong>
                    <span className="cell-secondary">
                      PRJ-{String(p.id).padStart(4, "0")}
                    </span>
                  </td>
                  <td>{p.client || "—"}</td>
                  <td>
                    <StatusBadge status={p.status} />
                  </td>
                  <td>{p.response_count || 0}</td>
                  <td>{p.end_date || "Not set"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!projects.length && (
            <div className="empty-table">
              <strong>No projects to show</strong>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
