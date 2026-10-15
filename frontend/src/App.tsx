import { useEffect, useState } from "react";
import { api, clearSession, getUser } from "./services/api";
import Sidebar from "./components/layout/Sidebar";
import Header from "./components/layout/Header";
import Toast from "./components/layout/Toast";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import Tasks from "./pages/Tasks";
import ProjectFiles from "./pages/ProjectFiles";
import SurveyData from "./pages/SurveyData";
import DataRecords from "./pages/DataRecords";
import TeamUsers from "./pages/TeamUsers";
import TeamWorkload from "./pages/TeamWorkload";
import Notifications from "./pages/Notifications";

function Settings({
  user,
  dark,
  onTheme,
  onLogout,
}: {
  user: any;
  dark: boolean;
  onTheme: () => void;
  onLogout: () => void;
}) {
  return (
    <section>
      <h1>Settings</h1>
      <p>{user?.email}</p>
      <button type="button" onClick={onTheme}>
        Switch to {dark ? "light" : "dark"} theme
      </button>
      <button type="button" onClick={onLogout}>
        Sign out
      </button>
    </section>
  );
}

function Reports() {
  return (
    <section>
      <h1>Reports</h1>
      <p>Reports are currently unavailable.</p>
    </section>
  );
}

const PAGE_NAMES = [
  "Dashboard",
  "Projects",
  "Tasks & Daily Updates",
  "Project Files & Data",
  "Survey Data",
  "Data Records",
  "Reports",
  "Team & Users",
  "Notifications",
  "Settings",
];
export default function App() {
  const [user, setUser] = useState<any>(getUser()),
    [page, setPage] = useState("Dashboard"),
    [dark, setDark] = useState(localStorage.getItem("nexgen_theme") === "dark"),
    [collapsed, setCollapsed] = useState(false),
    [toast, setToast] = useState<{
      text: string;
      kind: "success" | "error";
    } | null>(null);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("nexgen_theme", dark ? "dark" : "light");
  }, [dark]);
  useEffect(() => {
    if (!user) return;
    api("/auth/me")
      .then((r: any) => {
        if (r.user) {
          setUser(r.user);
          localStorage.setItem("nexgen_user", JSON.stringify(r.user));
        }
      })
      .catch(() => {
        clearSession();
        setUser(null);
      });
  }, []);
  function logout() {
    api("/auth/logout", { method: "POST" }).catch(() => {});
    clearSession();
    setUser(null);
    setPage("Dashboard");
  }
  function navigate(p: string) {
    setPage(p);
    if (p === "Notifications") setToast(null);
  }
  if (!user)
    return (
      <Login
        onLogin={(u) => {
          setUser(u);
          setToast({ text: "Signed in successfully.", kind: "success" });
        }}
      />
    );
  return (
    <div className="app-shell">
      <Sidebar
        page={page}
        onNavigate={navigate}
        user={user}
        onLogout={logout}
        collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
      />
      <main className="main-shell">
        <Header
          page={page}
          dark={dark}
          onTheme={() => setDark((v) => !v)}
          onNotifications={() => navigate("Notifications")}
          user={user}
        />
        <div className="page-content">
          {page === "Dashboard" && <Dashboard onNavigate={navigate} />}
          {page === "Projects" && <Projects user={user} />}
          {page === "Tasks & Daily Updates" && <Tasks user={user} />}
          {page === "Project Files & Data" && <ProjectFiles />}
          {page === "Survey Data" && <SurveyData />}
          {page === "Data Records" && <DataRecords />}
          {page === "Reports" && <Reports />}
          {page === "Team & Users" && user.role === "admin" && <TeamUsers />}
          {page === "Team & Workload" && <TeamWorkload user={user} />}
          {page === "Notifications" && <Notifications />}
          {page === "Settings" && (
            <Settings
              user={user}
              dark={dark}
              onTheme={() => setDark((v) => !v)}
              onLogout={logout}
            />
          )}
        </div>
        <footer className="app-footer">
          <span>© {new Date().getFullYear()} NexGen Market Research</span>
          <span>Research, organised.</span>
        </footer>
      </main>
      <Toast message={toast} onClose={() => setToast(null)} />
    </div>
  );
}
