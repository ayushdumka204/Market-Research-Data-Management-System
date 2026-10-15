import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import {
  User,
  Project,
  Task,
  Survey,
  DataRecord,
  FileRecord,
  Notification,
  AuditLog,
} from "./models.js";
const app = express(),
  PORT = Number(process.env.PORT || 5000),
  JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error(
    "JWT_SECRET must be set to a random value of at least 32 characters.",
  );
  process.exit(1);
}
const origins = (process.env.CORS_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((x) => x.trim())
  .filter(Boolean);
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(
  cors({
    origin(origin, cb) {
      if (!origin || origins.includes(origin)) return cb(null, true);
      return cb(new Error("Origin not allowed by CORS"));
    },
    credentials: false,
  }),
);
app.use(express.json({ limit: "2mb" }));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 600,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.resolve(
  process.env.UPLOAD_DIR || path.join(__dirname, "../uploads"),
);
fs.mkdirSync(uploadDir, { recursive: true });
const maxSize = (Number(process.env.MAX_FILE_SIZE_MB) || 25) * 1024 * 1024;
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) =>
    cb(
      null,
      crypto.randomUUID() + path.extname(file.originalname).toLowerCase(),
    ),
});
const upload = multer({
  storage,
  limits: { fileSize: maxSize },
  fileFilter: (_, file, cb) => {
    const allowed =
      /\.(csv|tsv|xlsx|xls|pdf|doc|docx|txt|png|jpg|jpeg|zip)$/i.test(
        file.originalname,
      );
    cb(allowed ? null : new Error("File type not permitted."), allowed);
  },
});
const id = (v) => mongoose.isValidObjectId(v);
const safeUser = (u) => ({
  id: String(u._id),
  name: u.name,
  email: u.email,
  role: u.role,
  active: u.active,
});
const asyncRoute = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
async function notify(userIds, title, message, type = "info", link = "") {
  const unique = [...new Set(userIds.filter(Boolean).map(String))];
  if (unique.length)
    await Notification.insertMany(
      unique.map((user_id) => ({ user_id, title, message, type, link })),
    );
}
async function audit(
  req,
  action,
  entity_type = "",
  entity_id = "",
  project_id = null,
  details = {},
) {
  await AuditLog.create({
    actor_id: req.user._id,
    action,
    entity_type,
    entity_id: String(entity_id || ""),
    project_id,
    details,
  });
}
function auth(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!token) return res.status(401).json({ message: "Please sign in." });
  try {
    const p = jwt.verify(token, JWT_SECRET);
    req.userId = p.sub;
    next();
  } catch {
    return res
      .status(401)
      .json({ message: "Session expired. Please sign in again." });
  }
}
const attachUser = asyncRoute(async (req, res, next) => {
  const user = await User.findById(req.userId);
  if (!user || !user.active)
    return res.status(401).json({ message: "Account is unavailable." });
  req.user = user;
  next();
});
const protect = [auth, attachUser];
const roles =
  (...allowed) =>
  (req, res, next) =>
    allowed.includes(req.user.role)
      ? next()
      : res
          .status(403)
          .json({
            message: "You do not have permission to perform this action.",
          });
async function visibleProject(user, projectId) {
  if (!id(projectId)) return null;
  const p = await Project.findById(projectId);
  if (!p) return null;
  if (user.role === "admin") return p;
  if (user.role === "leader" && String(p.leader_id) === String(user._id))
    return p;
  if (
    user.role === "team" &&
    p.team.some((x) => String(x) === String(user._id))
  )
    return p;
  return null;
}
function projectFilter(user) {
  if (user.role === "admin") return { archived: false };
  if (user.role === "leader") return { leader_id: user._id, archived: false };
  return { team: user._id, archived: false };
}
async function recordAudit(req, action, type, doc, projectId = null) {
  return audit(req, action, type, doc ? doc._id : "", projectId, {});
}
app.get("/api/health", (req, res) =>
  res.json({
    ok: true,
    service: "nexgen-research-api",
    database:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  }),
);
app.post(
  "/api/auth/login",
  asyncRoute(async (req, res) => {
    const email = String(req.body.email || "")
        .trim()
        .toLowerCase(),
      password = String(req.body.password || "");
    if (!email || !password)
      return res
        .status(400)
        .json({ message: "Email and password are required." });
    const user = await User.findOne({ email });
    if (
      !user ||
      !user.active ||
      !(await bcrypt.compare(password, user.password_hash))
    )
      return res.status(401).json({ message: "Invalid email or password." });
    const token = jwt.sign(
      { sub: String(user._id), role: user.role },
      JWT_SECRET,
      { expiresIn: "12h" },
    );
    res.json({ token, user: safeUser(user) });
  }),
);
app.get(
  "/api/auth/me",
  ...protect,
  asyncRoute(async (req, res) => res.json({ user: safeUser(req.user) })),
);
app.post(
  "/api/auth/logout",
  ...protect,
  asyncRoute(async (req, res) => res.json({ ok: true })),
);
app.get(
  "/api/dashboard",
  ...protect,
  asyncRoute(async (req, res) => {
    const filter = projectFilter(req.user);
    const projects = await Project.find(filter).select(
      "_id sample_target sample_completed status",
    );
    const projectIds = projects.map((p) => p._id);
    const taskFilter =
      req.user.role === "admin" ? {} : { project_id: { $in: projectIds } };
    const [active, awaiting, approved, surveys, records] = await Promise.all([
      Project.countDocuments({ ...filter, status: "ongoing" }),
      Task.countDocuments({
        ...taskFilter,
        status: { $in: ["submitted", "in_review"] },
      }),
      Task.countDocuments({ ...taskFilter, status: "approved" }),
      Survey.countDocuments({ project_id: { $in: projectIds } }),
      DataRecord.countDocuments({ project_id: { $in: projectIds } }),
    ]);
    res.json({
      active_projects: active,
      awaiting_review: awaiting,
      approved_tasks: approved,
      surveys,
      records,
      project_count: projects.length,
    });
  }),
);
app.get(
  "/api/users",
  ...protect,
  roles("admin", "leader"),
  asyncRoute(async (req, res) => {
    const filter = { active: true };
    if (req.query.role) filter.role = req.query.role;
    if (req.user.role === "leader") filter.role = "team";
    const users = await User.find(filter).sort({ name: 1 });
    res.json(users.map((u) => ({ ...safeUser(u), active: u.active })));
  }),
);
app.post(
  "/api/users",
  ...protect,
  roles("admin"),
  asyncRoute(async (req, res) => {
    const { name, email, password, role = "team" } = req.body;
    if (!name || !email || !password || password.length < 8)
      return res
        .status(400)
        .json({
          message:
            "Name, email and password (minimum 8 characters) are required.",
        });
    if (!["admin", "leader", "team"].includes(role))
      return res.status(400).json({ message: "Invalid role." });
    if (await User.exists({ email: String(email).toLowerCase() }))
      return res
        .status(409)
        .json({ message: "An account with this email already exists." });
    const u = await User.create({
      name,
      email,
      password_hash: await bcrypt.hash(password, 12),
      role,
    });
    await audit(req, "user.created", "User", u._id);
    res.status(201).json(safeUser(u));
  }),
);
app.patch(
  "/api/users/:id",
  ...protect,
  roles("admin"),
  asyncRoute(async (req, res) => {
    if (!id(req.params.id))
      return res.status(400).json({ message: "Invalid user ID." });
    const u = await User.findById(req.params.id);
    if (!u) return res.status(404).json({ message: "User not found." });
    if (u._id.equals(req.user._id) && req.body.active === false)
      return res
        .status(400)
        .json({ message: "You cannot deactivate your own account." });
    if (typeof req.body.active === "boolean") u.active = req.body.active;
    if (req.body.role && ["admin", "leader", "team"].includes(req.body.role))
      u.role = req.body.role;
    await u.save();
    await audit(req, "user.updated", "User", u._id);
    res.json(safeUser(u));
  }),
);
app.get(
  "/api/projects",
  ...protect,
  asyncRoute(async (req, res) => {
    const docs = await Project.find(projectFilter(req.user))
      .sort({ updatedAt: -1 })
      .populate("leader_id", "name email")
      .populate("team", "name email role");
    const counts = await Task.aggregate([
      { $match: { project_id: { $in: docs.map((p) => p._id) } } },
      {
        $group: {
          _id: "$project_id",
          count: { $sum: 1 },
          approved: {
            $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] },
          },
        },
      },
    ]);
    const map = new Map(counts.map((c) => [String(c._id), c]));
    res.json(
      docs.map((p) => ({
        ...p.toJSON(),
        id: String(p._id),
        leader_name: p.leader_id?.name || null,
        leader_id: p.leader_id ? String(p.leader_id._id) : null,
        team: p.team.map(safeUser),
        task_count: map.get(String(p._id))?.count || 0,
        approved_tasks: map.get(String(p._id))?.approved || 0,
      })),
    );
  }),
);
app.post(
  "/api/projects",
  ...protect,
  roles("admin"),
  asyncRoute(async (req, res) => {
    const b = req.body;
    if (!b.name?.trim())
      return res.status(400).json({ message: "Project name is required." });
    let leader = null;
    if (b.leader_id) {
      if (!id(b.leader_id))
        return res.status(400).json({ message: "Invalid leader." });
      leader = await User.findOne({
        _id: b.leader_id,
        role: "leader",
        active: true,
      });
      if (!leader)
        return res
          .status(400)
          .json({ message: "Choose an active project leader account." });
    }
    const eligible = [];
    for (const uid of b.eligible_team || []) {
      if (!id(uid))
        return res
          .status(400)
          .json({ message: "Invalid eligible team member." });
      const u = await User.findOne({ _id: uid, role: "team", active: true });
      if (!u)
        return res
          .status(400)
          .json({
            message: "Eligible team must contain active team accounts only.",
          });
      eligible.push(u._id);
    }
    const p = await Project.create({
      name: b.name,
      client: b.client || "",
      industry: b.industry || "",
      description: b.description || "",
      scope: b.scope || "",
      objectives: b.objectives || "",
      priority: b.priority || "normal",
      start_date: b.start_date || "",
      due_date: b.due_date || "",
      sample_target: Number(b.sample_target || 0),
      leader_id: leader ? leader._id : null,
      eligible_team: eligible,
      team: [],
      milestones: b.milestones || [],
      deliverables: b.deliverables || [],
      created_by: req.user._id,
      status: "planning",
    });
    if (leader)
      await notify(
        [leader._id],
        "New project assigned",
        `You have been assigned to ${p.name}.`,
        "project",
        `/projects/${p._id}`,
      );
    await audit(req, "project.created", "Project", p._id, p._id);
    res.status(201).json({ ...p.toJSON(), id: String(p._id) });
  }),
);
app.get(
  "/api/projects/:id",
  ...protect,
  asyncRoute(async (req, res) => {
    const p = await visibleProject(req.user, req.params.id);
    if (!p)
      return res
        .status(404)
        .json({ message: "Project not found or access denied." });
    await p.populate("leader_id", "name email");
    await p.populate("team", "name email role");
    res.json({
      ...p.toJSON(),
      id: String(p._id),
      leader_name: p.leader_id?.name || null,
      team: p.team.map(safeUser),
    });
  }),
);
app.patch(
  "/api/projects/:id",
  ...protect,
  asyncRoute(async (req, res) => {
    const p = await visibleProject(req.user, req.params.id);
    if (!p)
      return res
        .status(404)
        .json({ message: "Project not found or access denied." });
    if (
      req.user.role !== "admin" &&
      !(
        req.user.role === "leader" &&
        String(p.leader_id) === String(req.user._id)
      )
    )
      return res
        .status(403)
        .json({
          message: "Only admin or assigned leader can update this project.",
        });
    const allowed =
      req.user.role === "admin"
        ? [
            "name",
            "client",
            "industry",
            "description",
            "scope",
            "objectives",
            "priority",
            "start_date",
            "due_date",
            "sample_target",
            "status",
            "leader_id",
            "eligible_team",
            "milestones",
            "deliverables",
            "archived",
          ]
        : [
            "description",
            "status",
            "sample_completed",
            "milestones",
            "deliverables",
          ];
    for (const k of allowed) if (req.body[k] !== undefined) p[k] = req.body[k];
    if (p.status === "completed" && req.user.role !== "admin") {
      const pending = await Task.countDocuments({
        project_id: p._id,
        status: { $ne: "approved" },
      });
      if (pending)
        return res
          .status(400)
          .json({ message: "Approve all tasks before closing this project." });
      const missing = (p.deliverables || []).some((d) => d.required && !d.done);
      if (missing)
        return res
          .status(400)
          .json({
            message:
              "Complete required deliverables before closing this project.",
          });
    }
    await p.save();
    await audit(req, "project.updated", "Project", p._id, p._id);
    res.json({ ...p.toJSON(), id: String(p._id) });
  }),
);
app.post(
  "/api/projects/:id/team",
  ...protect,
  roles("admin", "leader"),
  asyncRoute(async (req, res) => {
    const p = await visibleProject(req.user, req.params.id);
    if (!p)
      return res
        .status(404)
        .json({ message: "Project not found or access denied." });
    if (
      req.user.role === "leader" &&
      String(p.leader_id) !== String(req.user._id)
    )
      return res
        .status(403)
        .json({ message: "Only the assigned leader can manage this team." });
    const ids = req.body.member_ids;
    if (!Array.isArray(ids))
      return res.status(400).json({ message: "member_ids must be an array." });
    const users = await User.find({
      _id: { $in: ids },
      role: "team",
      active: true,
    });
    if (users.length !== new Set(ids.map(String)).size)
      return res
        .status(400)
        .json({
          message: "Every selected user must be an active team member.",
        });
    if (
      req.user.role === "leader" &&
      p.eligible_team.length &&
      !users.every((u) =>
        p.eligible_team.some((x) => String(x) === String(u._id)),
      )
    )
      return res
        .status(403)
        .json({
          message:
            "One or more members are outside the admin-approved eligible pool.",
        });
    p.team = users.map((u) => u._id);
    await p.save();
    await notify(
      p.team,
      "Added to project",
      `You have been added to ${p.name}.`,
      "project",
      `/projects/${p._id}`,
    );
    await audit(req, "project.team_updated", "Project", p._id, p._id);
    res.json({ team: users.map(safeUser) });
  }),
);
app.get(
  "/api/tasks",
  ...protect,
  asyncRoute(async (req, res) => {
    let filter = {};
    if (req.user.role === "team") filter = { assigned_to: req.user._id };
    else if (req.user.role === "leader") {
      const ps = await Project.find({ leader_id: req.user._id }).select("_id");
      filter = { project_id: { $in: ps.map((p) => p._id) } };
    }
    if (req.query.project_id) {
      if (!id(req.query.project_id))
        return res.status(400).json({ message: "Invalid project ID." });
      filter.project_id = req.query.project_id;
    }
    const docs = await Task.find(filter)
      .sort({ updatedAt: -1 })
      .populate("project_id", "name")
      .populate("assigned_to", "name email");
    res.json(
      docs.map((t) => ({
        ...t.toJSON(),
        id: String(t._id),
        project_id: String(t.project_id?._id || t.project_id),
        project_name: t.project_id?.name || "",
        assigned_to: String(t.assigned_to?._id || t.assigned_to),
        assigned_name: t.assigned_to?.name || "",
      })),
    );
  }),
);
app.post(
  "/api/tasks",
  ...protect,
  roles("admin", "leader"),
  asyncRoute(async (req, res) => {
    const b = req.body,
      p = await visibleProject(req.user, b.project_id);
    if (!p)
      return res
        .status(404)
        .json({ message: "Project not found or access denied." });
    if (
      req.user.role === "leader" &&
      String(p.leader_id) !== String(req.user._id)
    )
      return res
        .status(403)
        .json({ message: "Only the assigned leader can assign tasks." });
    if (!id(b.assigned_to))
      return res.status(400).json({ message: "Choose a valid team member." });
    const member = await User.findOne({
      _id: b.assigned_to,
      role: "team",
      active: true,
    });
    if (!member)
      return res
        .status(400)
        .json({ message: "Assigned user must be an active team member." });
    if (!p.team.some((x) => String(x) === String(member._id)))
      return res
        .status(400)
        .json({
          message:
            "Add this member to the project team before assigning a task.",
        });
    const t = await Task.create({
      project_id: p._id,
      assigned_to: member._id,
      created_by: req.user._id,
      title: b.title,
      description: b.description || "",
      work_date: b.work_date || "",
      due_date: b.due_date || "",
    });
    await notify(
      [member._id],
      "New task assigned",
      `${t.title} has been assigned to you in ${p.name}.`,
      "task",
      `/tasks/${t._id}`,
    );
    await audit(req, "task.created", "Task", t._id, p._id);
    res.status(201).json({ ...t.toJSON(), id: String(t._id) });
  }),
);
app.post(
  "/api/tasks/:id/updates",
  ...protect,
  asyncRoute(async (req, res) => {
    const t = await Task.findById(req.params.id).populate("project_id");
    if (!t) return res.status(404).json({ message: "Task not found." });
    if (
      req.user.role === "team" &&
      String(t.assigned_to) !== String(req.user._id)
    )
      return res
        .status(403)
        .json({ message: "You can only update your own tasks." });
    if (
      req.user.role === "leader" &&
      String(t.project_id.leader_id) !== String(req.user._id)
    )
      return res
        .status(403)
        .json({ message: "This task is outside your assigned projects." });
    if (t.status === "approved")
      return res
        .status(400)
        .json({ message: "Approved tasks cannot be edited." });
    t.completed_count = Math.max(0, Number(req.body.completed_count || 0));
    t.hours_spent = Math.max(0, Number(req.body.hours_spent || 0));
    t.update_note = String(req.body.update_note || "").trim();
    if (!t.update_note)
      return res
        .status(400)
        .json({ message: "Add notes about completed and pending work." });
    t.work_date = req.body.work_date || t.work_date;
    t.status = "submitted";
    await t.save();
    await notify(
      [t.project_id.leader_id],
      "Daily update submitted",
      `${req.user.name} submitted an update for ${t.title}.`,
      "review",
      `/tasks/${t._id}`,
    );
    await audit(req, "task.update_submitted", "Task", t._id, t.project_id._id);
    res.json({ ...t.toJSON(), id: String(t._id) });
  }),
);
app.post(
  "/api/tasks/:id/review",
  ...protect,
  roles("admin", "leader"),
  asyncRoute(async (req, res) => {
    const t = await Task.findById(req.params.id).populate("project_id");
    if (!t) return res.status(404).json({ message: "Task not found." });
    if (
      req.user.role === "leader" &&
      String(t.project_id.leader_id) !== String(req.user._id)
    )
      return res
        .status(403)
        .json({ message: "This task is outside your assigned projects." });
    const decision = req.body.decision;
    if (!["approve", "changes"].includes(decision))
      return res
        .status(400)
        .json({ message: "Decision must be approve or changes." });
    if (!t.update_note)
      return res
        .status(400)
        .json({ message: "There is no submitted update to review." });
    t.status = decision === "approve" ? "approved" : "changes_requested";
    t.leader_feedback = String(req.body.feedback || "");
    t.reviewed_by = req.user._id;
    t.reviewed_at = new Date();
    await t.save();
    await notify(
      [t.assigned_to],
      decision === "approve" ? "Task update approved" : "Changes requested",
      decision === "approve"
        ? `Your update for ${t.title} was approved.`
        : `Please revise ${t.title}: ${t.leader_feedback}`,
      "review",
      `/tasks/${t._id}`,
    );
    await audit(req, `task.${decision}d`, "Task", t._id, t.project_id._id);
    res.json({ ...t.toJSON(), id: String(t._id) });
  }),
);
app.get(
  "/api/surveys",
  ...protect,
  asyncRoute(async (req, res) => {
    const ps = await Project.find(projectFilter(req.user)).select("_id name");
    const docs = await Survey.find({
      project_id: { $in: ps.map((p) => p._id) },
    })
      .sort({ updatedAt: -1 })
      .populate("project_id", "name");
    res.json(
      docs.map((s) => ({
        ...s.toJSON(),
        id: String(s._id),
        project_id: String(s.project_id?._id || s.project_id),
        project_name: s.project_id?.name || "",
      })),
    );
  }),
);
app.post(
  "/api/surveys",
  ...protect,
  roles("admin", "leader"),
  asyncRoute(async (req, res) => {
    const p = await visibleProject(req.user, req.body.project_id);
    if (!p)
      return res
        .status(404)
        .json({ message: "Project not found or access denied." });
    if (
      req.user.role === "leader" &&
      String(p.leader_id) !== String(req.user._id)
    )
      return res
        .status(403)
        .json({ message: "This project is not assigned to you." });
    const s = await Survey.create({
      project_id: p._id,
      survey_name: req.body.survey_name,
      source: req.body.source || "",
      response_target: Number(req.body.response_target || 0),
      response_count: Number(req.body.response_count || 0),
      notes: req.body.notes || "",
      created_by: req.user._id,
    });
    await audit(req, "survey.created", "Survey", s._id, p._id);
    res.status(201).json({ ...s.toJSON(), id: String(s._id) });
  }),
);
app.post(
  "/api/surveys/import",
  ...protect,
  roles("admin", "leader"),
  asyncRoute(async (req, res) => {
    const rows = req.body.rows;
    if (!Array.isArray(rows) || rows.length > 5000)
      return res
        .status(400)
        .json({ message: "Provide an array of up to 5,000 rows." });
    let created = 0;
    for (const row of rows) {
      const projectId = row.project_id || row.projectId;
      if (!id(projectId)) continue;
      const p = await visibleProject(req.user, projectId);
      if (!p) continue;
      await Survey.create({
        project_id: p._id,
        survey_name: String(row.survey_name || row.name || "Imported survey"),
        source: String(row.source || ""),
        response_target: Number(row.response_target || row.target || 0),
        response_count: Number(row.response_count || row.responses || 0),
        notes: String(row.notes || ""),
        created_by: req.user._id,
      });
      created++;
    }
    res.json({
      created,
      message: `Imported ${created} survey rows. Rows need a valid project_id column.`,
    });
  }),
);
app.get(
  "/api/records",
  ...protect,
  asyncRoute(async (req, res) => {
    const ps = await Project.find(projectFilter(req.user)).select("_id name");
    const docs = await DataRecord.find({
      project_id: { $in: ps.map((p) => p._id) },
    })
      .sort({ updatedAt: -1 })
      .populate("project_id", "name");
    res.json(
      docs.map((r) => ({
        ...r.toJSON(),
        id: String(r._id),
        project_id: String(r.project_id?._id || r.project_id),
        project_name: r.project_id?.name || "",
        created_at: r.createdAt,
        updated_at: r.updatedAt,
      })),
    );
  }),
);
app.post(
  "/api/records",
  ...protect,
  roles("admin", "leader"),
  asyncRoute(async (req, res) => {
    const p = await visibleProject(req.user, req.body.project_id);
    if (!p)
      return res
        .status(404)
        .json({ message: "Project not found or access denied." });
    if (
      req.user.role === "leader" &&
      String(p.leader_id) !== String(req.user._id)
    )
      return res
        .status(403)
        .json({ message: "This project is not assigned to you." });
    const r = await DataRecord.create({
      project_id: p._id,
      record_name: req.body.record_name,
      record_type: req.body.record_type || "Raw data",
      record_count: Number(req.body.record_count || 0),
      notes: req.body.notes || "",
      created_by: req.user._id,
    });
    await audit(req, "record.created", "DataRecord", r._id, p._id);
    res.status(201).json({ ...r.toJSON(), id: String(r._id) });
  }),
);
app.post(
  "/api/records/import",
  ...protect,
  roles("admin", "leader"),
  asyncRoute(async (req, res) => {
    const rows = req.body.rows;
    if (!Array.isArray(rows) || rows.length > 5000)
      return res
        .status(400)
        .json({ message: "Provide an array of up to 5,000 rows." });
    let created = 0;
    for (const row of rows) {
      const projectId = row.project_id || row.projectId;
      if (!id(projectId)) continue;
      const p = await visibleProject(req.user, projectId);
      if (!p) continue;
      await DataRecord.create({
        project_id: p._id,
        record_name: String(
          row.record_name || row.name || "Imported record set",
        ),
        record_type: String(row.record_type || row.type || "Raw data"),
        record_count: Number(row.record_count || row.count || 0),
        notes: String(row.notes || ""),
        created_by: req.user._id,
      });
      created++;
    }
    res.json({
      created,
      message: `Imported ${created} record rows. Rows need a valid project_id column.`,
    });
  }),
);
app.get(
  "/api/notifications",
  ...protect,
  asyncRoute(async (req, res) => {
    const docs = await Notification.find({ user_id: req.user._id })
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(
      docs.map((n) => ({
        ...n.toJSON(),
        id: String(n._id),
        created_at: n.createdAt,
        is_read: n.is_read,
      })),
    );
  }),
);
app.post(
  "/api/notifications/:id/read",
  ...protect,
  asyncRoute(async (req, res) => {
    const n = await Notification.findOneAndUpdate(
      { _id: req.params.id, user_id: req.user._id },
      { is_read: true },
      { new: true },
    );
    if (!n) return res.status(404).json({ message: "Notification not found." });
    res.json({ ok: true });
  }),
);
app.post(
  "/api/notifications/read-all",
  ...protect,
  asyncRoute(async (req, res) => {
    await Notification.updateMany(
      { user_id: req.user._id, is_read: false },
      { is_read: true },
    );
    res.json({ ok: true });
  }),
);
app.get(
  "/api/files",
  ...protect,
  asyncRoute(async (req, res) => {
    const ps = await Project.find(projectFilter(req.user)).select("_id name");
    const docs = await FileRecord.find({
      project_id: { $in: ps.map((p) => p._id) },
    })
      .sort({ createdAt: -1 })
      .populate("project_id", "name")
      .populate("uploaded_by", "name");
    res.json(
      docs.map((f) => ({
        ...f.toJSON(),
        id: String(f._id),
        project_id: String(f.project_id?._id || f.project_id),
        project_name: f.project_id?.name || "",
        created_at: f.createdAt,
      })),
    );
  }),
);
app.post(
  "/api/files",
  ...protect,
  upload.single("file"),
  asyncRoute(async (req, res) => {
    if (!req.file)
      return res.status(400).json({ message: "Choose a file to upload." });
    const p = await visibleProject(req.user, req.body.project_id);
    if (!p) {
      fs.unlink(req.file.path, () => {});
      return res
        .status(404)
        .json({ message: "Project not found or access denied." });
    }
    if (
      req.user.role === "leader" &&
      String(p.leader_id) !== String(req.user._id)
    ) {
      fs.unlink(req.file.path, () => {});
      return res
        .status(403)
        .json({ message: "This project is not assigned to you." });
    }
    const f = await FileRecord.create({
      project_id: p._id,
      original_name: path.basename(req.file.originalname),
      stored_name: req.file.filename,
      mime_type: req.file.mimetype,
      size_bytes: req.file.size,
      uploaded_by: req.user._id,
    });
    await audit(req, "file.uploaded", "File", f._id, p._id);
    res.status(201).json({ ...f.toJSON(), id: String(f._id) });
  }),
);
app.get(
  "/api/files/:id/download",
  ...protect,
  asyncRoute(async (req, res) => {
    const f = await FileRecord.findById(req.params.id);
    if (!f) return res.status(404).json({ message: "File not found." });
    const p = await visibleProject(req.user, f.project_id);
    if (!p)
      return res
        .status(404)
        .json({ message: "File not found or access denied." });
    const full = path.join(uploadDir, f.stored_name);
    if (!fs.existsSync(full))
      return res
        .status(410)
        .json({
          message: "Stored file is missing. Configure persistent storage.",
        });
    res.download(full, f.original_name);
  }),
);
app.delete(
  "/api/files/:id",
  ...protect,
  asyncRoute(async (req, res) => {
    const f = await FileRecord.findById(req.params.id);
    if (!f) return res.status(404).json({ message: "File not found." });
    const p = await visibleProject(req.user, f.project_id);
    if (!p)
      return res
        .status(404)
        .json({ message: "File not found or access denied." });
    if (
      req.user.role === "team" &&
      String(f.uploaded_by) !== String(req.user._id)
    )
      return res
        .status(403)
        .json({ message: "You can only delete files you uploaded." });
    if (
      req.user.role === "leader" &&
      String(p.leader_id) !== String(req.user._id)
    )
      return res
        .status(403)
        .json({ message: "This project is not assigned to you." });
    fs.unlink(path.join(uploadDir, f.stored_name), () => {});
    await f.deleteOne();
    await audit(req, "file.deleted", "File", f._id, p._id);
    res.json({ ok: true });
  }),
);
app.get(
  "/api/audit",
  ...protect,
  roles("admin", "leader"),
  asyncRoute(async (req, res) => {
    let filter = {};
    if (req.user.role === "leader") {
      const ps = await Project.find({ leader_id: req.user._id }).select("_id");
      filter = { project_id: { $in: ps.map((p) => p._id) } };
    }
    const docs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .populate("actor_id", "name email");
    res.json(
      docs.map((d) => ({
        ...d.toJSON(),
        id: String(d._id),
        actor_name: d.actor_id?.name || "User",
      })),
    );
  }),
);
app.use((err, req, res, next) => {
  console.error(err);
  if (err instanceof multer.MulterError)
    return res
      .status(400)
      .json({
        message:
          err.code === "LIMIT_FILE_SIZE"
            ? "File exceeds configured size limit."
            : err.message,
      });
  const status = err.status || 500;
  res
    .status(status)
    .json({
      message:
        status === 500 ? "An unexpected server error occurred." : err.message,
    });
});
app.use((req, res) =>
  res.status(404).json({ message: "API route not found." }),
);
mongoose
  .connect(process.env.MONGODB_URI || "")
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, "0.0.0.0", () => console.log(`API listening on ${PORT}`));
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });
