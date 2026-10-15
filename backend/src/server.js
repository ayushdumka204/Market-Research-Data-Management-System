import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import multer from "multer";
import { parse } from "csv-parse/sync";

const app = express();
const port = Number(process.env.PORT || 8080);
const allowedOrigins = (process.env.CORS_ORIGINS || "https://market-research-data-management-sys.vercel.app")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password_hash: { type: String, required: true },
    role: { type: String, enum: ["admin", "team"], default: "team" },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

const tokenSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    token_hash: { type: String, required: true, unique: true },
    expires_at: { type: Date, required: true, expires: 0 },
  },
  { timestamps: true },
);

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 180 },
    client: { type: String, default: "" },
    industry: { type: String, default: "" },
    description: { type: String, default: "", maxlength: 10000 },
    start_date: { type: String, default: null },
    end_date: { type: String, default: null },
    status: {
      type: String,
      enum: ["planning", "active", "on_hold", "completed"],
      default: "planning",
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

const responseSchema = new mongoose.Schema(
  {
    project_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    respondent_code: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    response_date: { type: String, required: true },
    channel: { type: String, default: "Other", maxlength: 100 },
    answers: { type: mongoose.Schema.Types.Mixed, default: {} },
    notes: { type: String, default: "", maxlength: 10000 },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);
responseSchema.index({ project_id: 1, respondent_code: 1 }, { unique: true });

const User = mongoose.model("User", userSchema);
const ApiToken = mongoose.model("ApiToken", tokenSchema);
const Project = mongoose.model("Project", projectSchema);
const Response = mongoose.model("Response", responseSchema);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});
app.disable("x-powered-by");
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin))
        return callback(null, true);
      return callback(new Error("Origin is not allowed by CORS."));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

const asyncRoute = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);
const cleanString = (value, max = 255) =>
  String(value ?? "")
    .trim()
    .slice(0, max);
const isDate = (value) =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");
const publicUser = (user) => ({
  id: String(user._id),
  name: user.name,
  email: user.email,
  role: user.role,
});

function publicProject(project, responseCount = 0) {
  return {
    id: String(project._id),
    name: project.name,
    client: project.client || "",
    industry: project.industry || "",
    description: project.description || "",
    start_date: project.start_date || null,
    end_date: project.end_date || null,
    status: project.status,
    created_at: project.created_at,
    updated_at: project.updated_at,
    response_count: responseCount,
  };
}

function publicResponse(response, projectName = "") {
  return {
    id: String(response._id),
    project_id: String(response.project_id),
    project_name: projectName,
    respondent_code: response.respondent_code,
    response_date: response.response_date,
    channel: response.channel || "Other",
    answers: response.answers || {},
    notes: response.notes || "",
    created_at: response.created_at,
  };
}

async function auth(req, res, next) {
  try {
    const token = (req.headers.authorization || "").match(
      /^Bearer\s+(.+)$/i,
    )?.[1];
    if (!token)
      return res.status(401).json({ error: "Please sign in to continue." });

    const storedToken = await ApiToken.findOne({
      token_hash: hashToken(token),
      expires_at: { $gt: new Date() },
    });
    if (!storedToken)
      return res
        .status(401)
        .json({ error: "Your session has expired. Please sign in again." });

    const user = await User.findById(storedToken.user_id);
    if (!user)
      return res
        .status(401)
        .json({ error: "This account is no longer available." });
    req.user = publicUser(user);
    next();
  } catch (error) {
    next(error);
  }
}

const adminOnly = (req, res, next) =>
  req.user?.role === "admin"
    ? next()
    : res
        .status(403)
        .json({
          error: "Administrator permission is required for this action.",
        });

async function getProjectsWithCounts(filter = {}) {
  const projects = await Project.find(filter).sort({ updated_at: -1 }).lean();
  const counts = await Response.aggregate([
    { $group: { _id: "$project_id", count: { $sum: 1 } } },
  ]);
  const countMap = new Map(
    counts.map((item) => [String(item._id), item.count]),
  );
  return projects.map((project) =>
    publicProject(project, countMap.get(String(project._id)) || 0),
  );
}

async function getResponses(filter = {}) {
  const responses = await Response.find(filter)
    .sort({ response_date: -1, created_at: -1 })
    .lean();
  const projectIds = [
    ...new Set(responses.map((item) => String(item.project_id))),
  ];
  const projects = await Project.find({ _id: { $in: projectIds } })
    .select("name")
    .lean();
  const names = new Map(
    projects.map((project) => [String(project._id), project.name]),
  );
  return responses.map((response) =>
    publicResponse(response, names.get(String(response.project_id)) || ""),
  );
}

function validateResponse(body) {
  if (!mongoose.isValidObjectId(body.project_id))
    return "Choose a valid project.";
  if (!cleanString(body.respondent_code, 100))
    return "Respondent code is required.";
  if (!isDate(body.response_date))
    return "Response date must use YYYY-MM-DD format.";
  let answers = body.answers ?? {};
  if (typeof answers === "string") {
    try {
      answers = JSON.parse(answers);
    } catch {
      return "Answers must be valid JSON.";
    }
  }
  if (!answers || typeof answers !== "object" || Array.isArray(answers))
    return "Answers must be a JSON object.";
  return null;
}

app.get(
  "/api/health",
  asyncRoute(async (_req, res) => {
    if (mongoose.connection.readyState !== 1) {
      return res
        .status(503)
        .json({ status: "error", database: "disconnected" });
    }
    await mongoose.connection.db.admin().ping();
    res.json({ status: "ok", database: "connected" });
  }),
);
app.get("/api", (_req, res) =>
  res.json({ name: "NexGen Research API", version: "1.0.0" }),
);

app.post(
  "/api/auth/login",
  asyncRoute(async (req, res) => {
    const email = cleanString(req.body?.email, 190).toLowerCase();
    const password = String(req.body?.password || "");
    if (!email || !password)
      return res
        .status(400)
        .json({ error: "Email and password are required." });

    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: "Email or password is incorrect." });
    }

    const token = crypto.randomBytes(32).toString("base64url");
    const days = Math.min(
      30,
      Math.max(1, Number(process.env.TOKEN_TTL_DAYS || 7)),
    );
    await ApiToken.create({
      user_id: user._id,
      token_hash: hashToken(token),
      expires_at: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
    });
    res.json({ token, user: publicUser(user) });
  }),
);

app.get("/api/auth/me", auth, (req, res) => res.json({ user: req.user }));
app.post(
  "/api/auth/logout",
  auth,
  asyncRoute(async (req, res) => {
    const token = req.headers.authorization.slice(7);
    await ApiToken.deleteOne({ token_hash: hashToken(token) });
    res.json({ ok: true });
  }),
);

app.get(
  "/api/dashboard",
  auth,
  asyncRoute(async (_req, res) => {
    const [
      totalProjects,
      activeProjects,
      totalResponses,
      completedProjects,
      recentProjects,
      recentResponses,
    ] = await Promise.all([
      Project.countDocuments(),
      Project.countDocuments({ status: "active" }),
      Response.countDocuments(),
      Project.countDocuments({ status: "completed" }),
      getProjectsWithCounts().then((items) => items.slice(0, 5)),
      getResponses().then((items) => items.slice(0, 5)),
    ]);
    res.json({
      total_projects: totalProjects,
      active_projects: activeProjects,
      total_responses: totalResponses,
      completed_projects: completedProjects,
      recent_projects: recentProjects,
      recent_responses: recentResponses,
    });
  }),
);

app.get(
  "/api/projects",
  auth,
  asyncRoute(async (_req, res) => {
    res.json(await getProjectsWithCounts());
  }),
);
app.post(
  "/api/projects",
  auth,
  asyncRoute(async (req, res) => {
    const body = req.body || {};
    const name = cleanString(body.name, 180);
    if (!name)
      return res.status(400).json({ error: "Project name is required." });
    const status = ["planning", "active", "on_hold", "completed"].includes(
      body.status,
    )
      ? body.status
      : "planning";
    const startDate = body.start_date || null;
    const endDate = body.end_date || null;
    if ((startDate && !isDate(startDate)) || (endDate && !isDate(endDate))) {
      return res
        .status(400)
        .json({ error: "Dates must use YYYY-MM-DD format." });
    }
    const project = await Project.create({
      name,
      client: cleanString(body.client, 180),
      industry: cleanString(body.industry, 120),
      description: cleanString(body.description, 10000),
      start_date: startDate,
      end_date: endDate,
      status,
      created_by: req.user.id,
    });
    res.status(201).json(publicProject(project, 0));
  }),
);
app.put(
  "/api/projects/:id",
  auth,
  asyncRoute(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(404).json({ error: "Project not found." });
    const body = req.body || {};
    const name = cleanString(body.name, 180);
    if (!name)
      return res.status(400).json({ error: "Project name is required." });
    const status = ["planning", "active", "on_hold", "completed"].includes(
      body.status,
    )
      ? body.status
      : "planning";
    const startDate = body.start_date || null;
    const endDate = body.end_date || null;
    if ((startDate && !isDate(startDate)) || (endDate && !isDate(endDate))) {
      return res
        .status(400)
        .json({ error: "Dates must use YYYY-MM-DD format." });
    }
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      {
        name,
        client: cleanString(body.client, 180),
        industry: cleanString(body.industry, 120),
        description: cleanString(body.description, 10000),
        start_date: startDate,
        end_date: endDate,
        status,
      },
      { new: true, runValidators: true },
    );
    if (!project) return res.status(404).json({ error: "Project not found." });
    const count = await Response.countDocuments({ project_id: project._id });
    res.json(publicProject(project, count));
  }),
);
app.delete(
  "/api/projects/:id",
  auth,
  adminOnly,
  asyncRoute(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(404).json({ error: "Project not found." });
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) return res.status(404).json({ error: "Project not found." });
    await Response.deleteMany({ project_id: project._id });
    res.json({ ok: true });
  }),
);

app.get(
  "/api/responses",
  auth,
  asyncRoute(async (_req, res) => res.json(await getResponses())),
);
app.post(
  "/api/responses",
  auth,
  asyncRoute(async (req, res) => {
    const body = req.body || {};
    const error = validateResponse(body);
    if (error) return res.status(400).json({ error });
    if (!(await Project.exists({ _id: body.project_id })))
      return res
        .status(400)
        .json({ error: "The selected project does not exist." });
    try {
      const response = await Response.create({
        project_id: body.project_id,
        respondent_code: cleanString(body.respondent_code, 100),
        response_date: body.response_date,
        channel: cleanString(body.channel, 100) || "Other",
        answers:
          typeof body.answers === "string"
            ? JSON.parse(body.answers || "{}")
            : (body.answers ?? {}),
        notes: cleanString(body.notes, 10000),
      });
      res
        .status(201)
        .json(
          publicResponse(
            response,
            (await Project.findById(body.project_id).select("name").lean())
              ?.name || "",
          ),
        );
    } catch (error) {
      if (error.code === 11000)
        return res
          .status(409)
          .json({
            error: "That respondent code already exists for this project.",
          });
      throw error;
    }
  }),
);
app.put(
  "/api/responses/:id",
  auth,
  asyncRoute(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(404).json({ error: "Response not found." });
    const body = req.body || {};
    const error = validateResponse(body);
    if (error) return res.status(400).json({ error });
    if (!(await Project.exists({ _id: body.project_id })))
      return res
        .status(400)
        .json({ error: "The selected project does not exist." });
    try {
      const response = await Response.findByIdAndUpdate(
        req.params.id,
        {
          project_id: body.project_id,
          respondent_code: cleanString(body.respondent_code, 100),
          response_date: body.response_date,
          channel: cleanString(body.channel, 100) || "Other",
          answers:
            typeof body.answers === "string"
              ? JSON.parse(body.answers || "{}")
              : (body.answers ?? {}),
          notes: cleanString(body.notes, 10000),
        },
        { new: true, runValidators: true },
      );
      if (!response)
        return res.status(404).json({ error: "Response not found." });
      const project = await Project.findById(response.project_id)
        .select("name")
        .lean();
      res.json(publicResponse(response, project?.name || ""));
    } catch (error) {
      if (error.code === 11000)
        return res
          .status(409)
          .json({
            error: "That respondent code already exists for this project.",
          });
      throw error;
    }
  }),
);
app.delete(
  "/api/responses/:id",
  auth,
  adminOnly,
  asyncRoute(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(404).json({ error: "Response not found." });
    const response = await Response.findByIdAndDelete(req.params.id);
    if (!response)
      return res.status(404).json({ error: "Response not found." });
    res.json({ ok: true });
  }),
);

app.post(
  "/api/responses/import",
  auth,
  upload.single("file"),
  asyncRoute(async (req, res) => {
    if (!req.file)
      return res.status(400).json({ error: "Choose a CSV file to import." });
    const text = req.file.buffer.toString("utf8").replace(/^\uFEFF/, "");
    let records;
    try {
      records = parse(text, {
        columns: (headers) =>
          headers.map((header) => header.trim().toLowerCase()),
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
        max_record_size: 100000,
      });
    } catch {
      return res
        .status(400)
        .json({
          error: "Could not read CSV. Check its header row and quoting.",
        });
    }
    if (records.length > 5000)
      return res
        .status(400)
        .json({ error: "Import is limited to 5,000 rows per file." });
    const errors = [];
    let imported = 0;
    for (let index = 0; index < records.length; index += 1) {
      const body = records[index];
      const issue = validateResponse(body);
      if (issue) {
        errors.push(`Row ${index + 2}: ${issue}`);
        continue;
      }
      if (!(await Project.exists({ _id: body.project_id }))) {
        errors.push(`Row ${index + 2}: project_id does not exist.`);
        continue;
      }
      let answers;
      try {
        answers =
          typeof body.answers === "string"
            ? JSON.parse(body.answers || "{}")
            : (body.answers ?? {});
        if (!answers || typeof answers !== "object" || Array.isArray(answers))
          throw new Error("Invalid answers");
      } catch {
        errors.push(`Row ${index + 2}: answers must contain a JSON object.`);
        continue;
      }
      try {
        await Response.create({
          project_id: body.project_id,
          respondent_code: cleanString(body.respondent_code, 100),
          response_date: body.response_date,
          channel: cleanString(body.channel, 100) || "Other",
          answers,
          notes: cleanString(body.notes, 10000),
        });
        imported += 1;
      } catch (error) {
        if (error.code === 11000)
          errors.push(
            `Row ${index + 2}: respondent code already exists for this project.`,
          );
        else throw error;
      }
    }
    res.json({ imported, errors: errors.slice(0, 100) });
  }),
);

app.get(
  "/api/users",
  auth,
  adminOnly,
  asyncRoute(async (_req, res) => {
    const users = await User.find().sort({ created_at: -1 }).lean();
    res.json(users.map(publicUser));
  }),
);
app.post(
  "/api/users",
  auth,
  adminOnly,
  asyncRoute(async (req, res) => {
    const body = req.body || {};
    const name = cleanString(body.name, 120);
    const email = cleanString(body.email, 190).toLowerCase();
    const password = String(body.password || "");
    const role = body.role === "admin" ? "admin" : "team";
    if (!name || !/^\S+@\S+\.\S+$/.test(email))
      return res
        .status(400)
        .json({ error: "Enter a name and valid email address." });
    if (password.length < 12)
      return res
        .status(400)
        .json({ error: "Password must be at least 12 characters." });
    try {
      const user = await User.create({
        name,
        email,
        password_hash: await bcrypt.hash(password, 12),
        role,
      });
      res.status(201).json(publicUser(user));
    } catch (error) {
      if (error.code === 11000)
        return res
          .status(409)
          .json({ error: "An account with this email already exists." });
      throw error;
    }
  }),
);
app.delete(
  "/api/users/:id",
  auth,
  adminOnly,
  asyncRoute(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(404).json({ error: "User not found." });
    if (String(req.params.id) === req.user.id)
      return res
        .status(400)
        .json({ error: "You cannot remove your own account." });
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ error: "User not found." });
    if (
      target.role === "admin" &&
      (await User.countDocuments({ role: "admin" })) <= 1
    ) {
      return res
        .status(400)
        .json({ error: "At least one administrator account must remain." });
    }
    await ApiToken.deleteMany({ user_id: target._id });
    await target.deleteOne();
    res.json({ ok: true });
  }),
);

app.use((req, res) =>
  res.status(404).json({ error: "API endpoint not found." }),
);
app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError) {
    return res
      .status(400)
      .json({
        error:
          error.code === "LIMIT_FILE_SIZE"
            ? "File must be 5 MB or smaller."
            : "Upload could not be processed.",
      });
  }
  if (error.message === "Origin is not allowed by CORS.")
    return res.status(403).json({ error: error.message });
  console.error(
    `[${new Date().toISOString()}]`,
    error.code || error.name,
    error.message,
  );
  res
    .status(500)
    .json({
      error:
        process.env.NODE_ENV === "production"
          ? "An unexpected server error occurred."
          : error.message,
    });
});

async function startServer() {
  if (!process.env.MONGODB_URI) {
    throw new Error(
      "MONGODB_URI is missing. Add your MongoDB Atlas connection string in the environment.",
    );
  }
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
  });
  console.log("Connected to MongoDB.");
  app.listen(port, "0.0.0.0", () =>
    console.log(`NexGen Research API listening on ${port}`),
  );
}

startServer().catch((error) => {
  console.error("Could not start NexGen Research API:", error.message);
  process.exit(1);
});
