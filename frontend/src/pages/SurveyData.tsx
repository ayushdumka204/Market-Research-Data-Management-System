import { useEffect, useState } from "react";
import { Download, Plus, Search, UploadCloud } from "lucide-react";
import * as XLSX from "xlsx";
import { api, body } from "../services/api";
import type { Project, Survey } from "../types";
import PageTitle from "../components/layout/PageTitle";
import StatusBadge from "../components/ui/StatusBadge";
import Modal from "../components/ui/Modal";
import Field from "../components/forms/Field";
import DataTable from "../components/tables/DataTable";
import { downloadCsv } from "../utils/format";
export default function SurveyData() {
  const [items, setItems] = useState<Survey[]>([]),
    [projects, setProjects] = useState<Project[]>([]),
    [query, setQuery] = useState(""),
    [error, setError] = useState(""),
    [show, setShow] = useState(false),
    [busy, setBusy] = useState(false);
  const [form, setForm] = useState<any>({
    project_id: "",
    survey_name: "",
    source: "Field survey",
    response_target: "",
    response_count: "0",
    notes: "",
  });
  async function load() {
    try {
      const [s, p] = await Promise.all([
        api<Survey[]>("/surveys"),
        api<Project[]>("/projects"),
      ]);
      setItems(s);
      setProjects(p);
      setError("");
    } catch (e: any) {
      setError(e.message);
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/surveys", {
        method: "POST",
        body: body({
          ...form,
          project_id: form.project_id,
          response_target: Number(form.response_target || 0),
          response_count: Number(form.response_count || 0),
        }),
      });
      setShow(false);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function importFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf);
      const rows = XLSX.utils.sheet_to_json<any>(wb.Sheets[wb.SheetNames[0]]);
      if (!rows.length) throw new Error("The selected file has no data rows.");
      await api("/surveys/import", { method: "POST", body: body({ rows }) });
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      e.target.value = "";
    }
  }
  const filtered = items.filter((s) =>
    (s.survey_name + " " + (s.project_name || ""))
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const exportRows = [
    [
      "Survey name",
      "Project",
      "Source",
      "Response target",
      "Responses received",
      "Status",
    ],
    ...filtered.map((s) => [
      s.survey_name,
      s.project_name,
      s.source,
      s.response_target,
      s.response_count,
      s.status,
    ]),
  ];
  return (
    <>
      <PageTitle
        title="Survey Data"
        description="Organise survey instruments, fieldwork sources and response collection."
        actions={
          <>
            <label className="button secondary upload-button">
              <UploadCloud size={15} /> Import CSV / Excel
              <input
                hidden
                type="file"
                accept=".csv,.tsv,.xlsx,.xls"
                onChange={importFile}
              />
            </label>
            <button className="button primary" onClick={() => setShow(true)}>
              <Plus size={16} /> Add survey
            </button>
          </>
        }
      />
      {error && <div className="error-banner">{error}</div>}
      <div className="metric-grid compact">
        <div className="metric-card">
          <div className="metric-top">Survey instruments</div>
          <strong>{items.length}</strong>
          <small>Tracked in workspace</small>
        </div>
        <div className="metric-card">
          <div className="metric-top">Response target</div>
          <strong>
            {items
              .reduce((n, s) => n + s.response_target, 0)
              .toLocaleString("en-IN")}
          </strong>
          <small>Combined target</small>
        </div>
        <div className="metric-card">
          <div className="metric-top">Responses received</div>
          <strong>
            {items
              .reduce((n, s) => n + s.response_count, 0)
              .toLocaleString("en-IN")}
          </strong>
          <small>Reported response count</small>
        </div>
      </div>
      <section className="surface">
        <div className="table-toolbar">
          <div className="search-box">
            <Search size={16} />
            <input
              placeholder="Search survey instruments…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button
            className="button secondary"
            onClick={() => downloadCsv("nexgen-surveys.csv", exportRows)}
          >
            <Download size={15} /> Export CSV
          </button>
        </div>
        <DataTable
          headers={[
            "Survey / instrument",
            "Project",
            "Data source",
            "Target responses",
            "Received",
            "Status",
          ]}
          empty={!filtered.length}
          emptyTitle="No survey data yet"
          emptyDescription="Add a survey instrument to begin organising collection."
        >
          {filtered.map((s) => (
            <tr key={s.id}>
              <td>
                <b>{s.survey_name}</b>
                <small className="cell-sub">
                  {s.notes || "Survey instrument"}
                </small>
              </td>
              <td>{s.project_name || "—"}</td>
              <td>{s.source || "—"}</td>
              <td>{s.response_target.toLocaleString("en-IN")}</td>
              <td>{s.response_count.toLocaleString("en-IN")}</td>
              <td>
                <StatusBadge status={s.status} />
              </td>
            </tr>
          ))}
        </DataTable>
      </section>
      {show && (
        <Modal
          title="Add survey instrument"
          eyebrow="FIELDWORK SETUP"
          onClose={() => setShow(false)}
          onSubmit={create}
          submitLabel="Save survey"
          busy={busy}
        >
          <div className="form-grid">
            <Field label="Survey name *">
              <input
                required
                value={form.survey_name}
                onChange={(e) =>
                  setForm({ ...form, survey_name: e.target.value })
                }
              />
            </Field>
            <Field label="Project *">
              <select
                required
                value={form.project_id}
                onChange={(e) =>
                  setForm({ ...form, project_id: e.target.value })
                }
              >
                <option value="">Choose project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Data source">
              <select
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
              >
                <option>Field survey</option>
                <option>Online survey</option>
                <option>CATI</option>
                <option>CAWI</option>
                <option>Secondary research</option>
                <option>Other</option>
              </select>
            </Field>
            <Field label="Response target">
              <input
                type="number"
                min="0"
                value={form.response_target}
                onChange={(e) =>
                  setForm({ ...form, response_target: e.target.value })
                }
              />
            </Field>
            <Field label="Responses received">
              <input
                type="number"
                min="0"
                value={form.response_count}
                onChange={(e) =>
                  setForm({ ...form, response_count: e.target.value })
                }
              />
            </Field>
            <Field label="Notes">
              <textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </Field>
          </div>
        </Modal>
      )}
    </>
  );
}
