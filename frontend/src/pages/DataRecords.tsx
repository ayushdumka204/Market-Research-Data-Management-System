import { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  Download,
  Upload,
  Search,
  Database,
  FileSpreadsheet,
  AlertCircle,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { api } from "../services/api";
import type { Project, ResponseRecord, User } from "../types";
export default function DataRecords({ user }: { user: User }) {
  const [rows, setRows] = useState<ResponseRecord[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [fileBusy, setFileBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const [params] = useSearchParams();
  useEffect(() => {
    setSearch(params.get("search") || "");
  }, [params]);
  async function load() {
    try {
      const [r, p] = await Promise.all([
        api<ResponseRecord[]>("/responses"),
        api<Project[]>("/projects"),
      ]);
      setRows(r);
      setProjects(p);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    load();
  }, []);
  function csvEscape(v: unknown) {
    let s =
      typeof v === "object" && v !== null ? JSON.stringify(v) : String(v ?? "");
    if (/^[=+@\-]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  }
  function exportCsv() {
    const header = [
      "id",
      "project_id",
      "project_name",
      "respondent_code",
      "response_date",
      "channel",
      "answers",
      "notes",
    ];
    const data = [
      header,
      ...rows.map((r) => [
        r.id,
        r.project_id,
        r.project_name,
        r.respondent_code,
        r.response_date,
        r.channel,
        typeof r.answers === "string" ? r.answers : JSON.stringify(r.answers),
        r.notes,
      ]),
    ];
    const sheet = XLSX.utils.aoa_to_sheet(data);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Research Records");
    XLSX.writeFile(book, "nexgen-research-records.xlsx");
    setMessage(`Exported ${rows.length} records to Excel.`);
  }
  async function importCsv(file?: File) {
    if (!file) return;
    setFileBusy(true);
    setMessage("");
    setError("");
    try {
      let upload: File = file;
      if (
        file.name.toLowerCase().endsWith(".xlsx") ||
        file.name.toLowerCase().endsWith(".xls")
      ) {
        const bytes = await file.arrayBuffer();
        const workbook = XLSX.read(bytes, { type: "array" });
        const first = workbook.Sheets[workbook.SheetNames[0]];
        if (!first) throw new Error("The Excel workbook has no worksheets.");
        const csv = XLSX.utils.sheet_to_csv(first);
        upload = new File([csv], file.name.replace(/\.(xlsx|xls)$/i, ".csv"), {
          type: "text/csv",
        });
      }
      const form = new FormData();
      form.append("file", upload);
      const result = await api<{ imported: number; errors?: string[] }>(
        "/responses/import",
        { method: "POST", body: form },
      );
      setMessage(
        `Imported ${result.imported} responses.${result.errors?.length ? " Some rows were skipped: " + result.errors.slice(0, 3).join("; ") : ""}`,
      );
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setFileBusy(false);
      if (input.current) input.current.value = "";
    }
  }
  const shown = rows.filter((r) =>
    (
      r.respondent_code +
      " " +
      r.project_name +
      " " +
      r.channel +
      " " +
      JSON.stringify(r.answers)
    )
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <>
      <PageHeader
        eyebrow="RESEARCH DATA LIBRARY"
        title="Data records"
        description="A practical home for collected research data. Search records or move them in and out with CSV or Excel."
        actions={
          <>
            <button className="btn btn-secondary" onClick={exportCsv}>
              <Download size={16} /> Export Excel
            </button>
            <button
              className="btn btn-primary"
              onClick={() => input.current?.click()}
              disabled={fileBusy}
            >
              <Upload size={16} />
              {fileBusy ? "Importing…" : "Import CSV"}
            </button>
            <input
              ref={input}
              type="file"
              accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              hidden
              onChange={(e) => importCsv(e.target.files?.[0])}
            />
          </>
        }
      />
      {message && (
        <div className="success-box">
          <FileSpreadsheet size={17} />
          {message}
        </div>
      )}
      {error && <div className="error-box">{error}</div>}
      <div className="import-hint">
        <div className="hint-icon">
          <AlertCircle size={18} />
        </div>
        <div>
          <strong>CSV / Excel import format</strong>
          <p>
            Required columns:{" "}
            <code>project_id, respondent_code, response_date</code>. Optional:{" "}
            <code>channel, answers, notes</code>. The project ID must already
            exist; answers can be a JSON string.
          </p>
        </div>
        <button
          className="text-button"
          onClick={() => {
            const blob = new Blob(
              [
                'project_id (MongoDB ObjectId), respondent_code, response_date,channel,answers,notes\n1,RESP-001,2026-10-15,Online survey,"{\"satisfaction\":5}",Sample note\n',
              ],
              { type: "text/csv" },
            );
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "nexgen-import-template.csv";
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          Get CSV template <Download size={14} />
        </button>
      </div>
      <div className="toolbar">
        <label className="search-field">
          <Search size={17} />
          <input
            placeholder="Search across respondents, projects and answers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <span className="result-count">{shown.length} records</span>
      </div>
      <section className="panel table-panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Respondent</th>
                <th>Project</th>
                <th>Date</th>
                <th>Channel</th>
                <th>Answer preview</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div className="table-project">
                      <div className="respondent-avatar">
                        <Database size={15} />
                      </div>
                      <div>
                        <strong>{r.respondent_code}</strong>
                        <span>REC-{String(r.id).padStart(5, "0")}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <strong className="cell-primary">
                      {r.project_name || `Project #${r.project_id}`}
                    </strong>
                  </td>
                  <td>{r.response_date}</td>
                  <td>
                    <span className="channel-chip">{r.channel || "—"}</span>
                  </td>
                  <td>
                    <code className="json-preview">
                      {JSON.stringify(
                        typeof r.answers === "string"
                          ? safeParse(r.answers)
                          : r.answers,
                      ).slice(0, 95) || "{}"}
                    </code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!shown.length && (
            <div className="empty-table">
              <div className="empty-icon">
                <Database size={22} />
              </div>
              <strong>No records found</strong>
              <p>Try another search, add survey responses, or import a CSV.</p>
            </div>
          )}
        </div>
        <div className="table-foot">
          <span>
            Showing {shown.length} of {rows.length} records
          </span>
          <span>{projects.length} linked projects</span>
        </div>
      </section>
      <p className="privacy-footnote">
        Research data may contain confidential information. Export only to
        approved locations and avoid placing personal identifiers in respondent
        codes.
      </p>
    </>
  );
}
function safeParse(v: string) {
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
}
