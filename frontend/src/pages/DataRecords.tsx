import { useEffect, useState } from "react";
import { Download, Plus, Search, Upload } from "lucide-react";
import * as XLSX from "xlsx";
import { api, body } from "../services/api";
import type { Project, DataRecord } from "../types";
import PageTitle from "../components/layout/PageTitle";
import Modal from "../components/ui/Modal";
import Field from "../components/forms/Field";
import DataTable from "../components/tables/DataTable";
import { downloadCsv, dateLabel } from "../utils/format";
export default function DataRecords() {
  const [items, setItems] = useState<DataRecord[]>([]),
    [projects, setProjects] = useState<Project[]>([]),
    [query, setQuery] = useState(""),
    [error, setError] = useState(""),
    [show, setShow] = useState(false),
    [busy, setBusy] = useState(false);
  const [form, setForm] = useState<any>({
    project_id: "",
    record_name: "",
    record_type: "Raw data",
    record_count: "0",
    notes: "",
  });
  async function load() {
    try {
      const [r, p] = await Promise.all([
        api<DataRecord[]>("/records"),
        api<Project[]>("/projects"),
      ]);
      setItems(r);
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
      await api("/records", {
        method: "POST",
        body: body({
          ...form,
          project_id: form.project_id,
          record_count: Number(form.record_count || 0),
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
      const wb = XLSX.read(await f.arrayBuffer());
      const rows = XLSX.utils.sheet_to_json<any>(wb.Sheets[wb.SheetNames[0]]);
      if (!rows.length) throw new Error("The selected file has no data rows.");
      await api("/records/import", { method: "POST", body: body({ rows }) });
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      e.target.value = "";
    }
  }
  const filtered = items.filter((r) =>
    (r.record_name + " " + (r.project_name || ""))
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const exportRows = [
    ["Record set", "Project", "Type", "Record count", "Notes", "Created"],
    ...filtered.map((r) => [
      r.record_name,
      r.project_name,
      r.record_type,
      r.record_count,
      r.notes,
      dateLabel(r.created_at),
    ]),
  ];
  return (
    <>
      <PageTitle
        title="Data Records"
        description="Manage collected datasets, validated records and final research datasheets."
        actions={
          <>
            <label className="button secondary upload-button">
              <Upload size={15} /> Import CSV / Excel
              <input
                hidden
                type="file"
                accept=".csv,.tsv,.xlsx,.xls"
                onChange={importFile}
              />
            </label>
            <button className="button primary" onClick={() => setShow(true)}>
              <Plus size={16} /> Add record set
            </button>
          </>
        }
      />
      {error && <div className="error-banner">{error}</div>}
      <div className="metric-grid compact">
        <div className="metric-card">
          <div className="metric-top">Record sets</div>
          <strong>{items.length}</strong>
          <small>Stored datasets</small>
        </div>
        <div className="metric-card">
          <div className="metric-top">Total records</div>
          <strong>
            {items
              .reduce((n, r) => n + r.record_count, 0)
              .toLocaleString("en-IN")}
          </strong>
          <small>Across visible datasets</small>
        </div>
        <div className="metric-card">
          <div className="metric-top">Projects linked</div>
          <strong>{new Set(items.map((r) => r.project_id)).size}</strong>
          <small>Projects with records</small>
        </div>
      </div>
      <section className="surface">
        <div className="table-toolbar">
          <div className="search-box">
            <Search size={16} />
            <input
              placeholder="Search datasets…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button
            className="button secondary"
            onClick={() => downloadCsv("nexgen-data-records.csv", exportRows)}
          >
            <Download size={15} /> Export CSV
          </button>
        </div>
        <DataTable
          headers={[
            "Dataset / record set",
            "Project",
            "Type",
            "Record count",
            "Created",
          ]}
          empty={!filtered.length}
          emptyTitle="No data records yet"
          emptyDescription="Create a record set or import a CSV/Excel file."
        >
          {filtered.map((r) => (
            <tr key={r.id}>
              <td>
                <b>{r.record_name}</b>
                <small className="cell-sub">
                  {r.notes || "Research dataset"}
                </small>
              </td>
              <td>{r.project_name || "—"}</td>
              <td>{r.record_type}</td>
              <td>{r.record_count.toLocaleString("en-IN")}</td>
              <td>{dateLabel(r.created_at)}</td>
            </tr>
          ))}
        </DataTable>
      </section>
      {show && (
        <Modal
          title="Add record set"
          eyebrow="DATA MANAGEMENT"
          onClose={() => setShow(false)}
          onSubmit={create}
          submitLabel="Save record set"
          busy={busy}
        >
          <div className="form-grid">
            <Field label="Record set name *">
              <input
                required
                value={form.record_name}
                onChange={(e) =>
                  setForm({ ...form, record_name: e.target.value })
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
            <Field label="Record type">
              <select
                value={form.record_type}
                onChange={(e) =>
                  setForm({ ...form, record_type: e.target.value })
                }
              >
                <option>Raw data</option>
                <option>Cleaned data</option>
                <option>Validated data</option>
                <option>Final datasheet</option>
                <option>Codebook</option>
              </select>
            </Field>
            <Field label="Record count">
              <input
                type="number"
                min="0"
                value={form.record_count}
                onChange={(e) =>
                  setForm({ ...form, record_count: e.target.value })
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
