import mongoose from "mongoose";
const { Schema, model } = mongoose;
const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
      index: true,
    },
    password_hash: { type: String, required: true },
    role: {
      type: String,
      enum: ["admin", "leader", "team"],
      default: "team",
      index: true,
    },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);
const projectSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    client: { type: String, default: "" },
    industry: { type: String, default: "" },
    description: { type: String, default: "" },
    scope: { type: String, default: "" },
    objectives: { type: String, default: "" },
    priority: {
      type: String,
      enum: ["low", "normal", "high", "urgent"],
      default: "normal",
    },
    status: {
      type: String,
      enum: ["planning", "ongoing", "on_hold", "completed"],
      default: "planning",
      index: true,
    },
    start_date: { type: String, default: "" },
    due_date: { type: String, default: "" },
    sample_target: { type: Number, default: 0, min: 0 },
    sample_completed: { type: Number, default: 0, min: 0 },
    leader_id: { type: Schema.Types.ObjectId, ref: "User", default: null },
    eligible_team: [{ type: Schema.Types.ObjectId, ref: "User" }],
    team: [{ type: Schema.Types.ObjectId, ref: "User" }],
    milestones: [
      {
        title: String,
        due_date: String,
        done: { type: Boolean, default: false },
      },
    ],
    deliverables: [
      {
        title: String,
        required: { type: Boolean, default: false },
        done: { type: Boolean, default: false },
      },
    ],
    created_by: { type: Schema.Types.ObjectId, ref: "User", required: true },
    archived: { type: Boolean, default: false },
  },
  { timestamps: true },
);
const taskSchema = new Schema(
  {
    project_id: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    assigned_to: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    created_by: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    status: {
      type: String,
      enum: [
        "todo",
        "in_progress",
        "submitted",
        "in_review",
        "approved",
        "changes_requested",
      ],
      default: "todo",
      index: true,
    },
    work_date: { type: String, default: "" },
    due_date: { type: String, default: "" },
    completed_count: { type: Number, default: 0, min: 0 },
    hours_spent: { type: Number, default: 0, min: 0 },
    update_note: { type: String, default: "" },
    leader_feedback: { type: String, default: "" },
    evidence_files: [{ type: Schema.Types.ObjectId, ref: "File" }],
    reviewed_by: { type: Schema.Types.ObjectId, ref: "User", default: null },
    reviewed_at: { type: Date, default: null },
  },
  { timestamps: true },
);
const surveySchema = new Schema(
  {
    project_id: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    survey_name: { type: String, required: true },
    source: { type: String, default: "" },
    response_target: { type: Number, default: 0, min: 0 },
    response_count: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ["active", "paused", "completed"],
      default: "active",
    },
    notes: { type: String, default: "" },
    created_by: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);
const recordSchema = new Schema(
  {
    project_id: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    record_name: { type: String, required: true },
    record_type: { type: String, default: "Raw data" },
    record_count: { type: Number, default: 0, min: 0 },
    notes: { type: String, default: "" },
    created_by: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);
const fileSchema = new Schema(
  {
    project_id: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    original_name: { type: String, required: true },
    stored_name: { type: String, required: true },
    mime_type: { type: String, default: "application/octet-stream" },
    size_bytes: { type: Number, default: 0 },
    uploaded_by: { type: Schema.Types.ObjectId, ref: "User", required: true },
    category: { type: String, default: "project-file" },
    version: { type: Number, default: 1 },
  },
  { timestamps: true },
);
const notificationSchema = new Schema(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, default: "info" },
    link: { type: String, default: "" },
    is_read: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);
const auditSchema = new Schema(
  {
    actor_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    project_id: { type: Schema.Types.ObjectId, ref: "Project", default: null },
    action: { type: String, required: true },
    entity_type: { type: String, default: "" },
    entity_id: { type: String, default: "" },
    details: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);
export const User = model("User", userSchema);
export const Project = model("Project", projectSchema);
export const Task = model("Task", taskSchema);
export const Survey = model("Survey", surveySchema);
export const DataRecord = model("DataRecord", recordSchema);
export const FileRecord = model("File", fileSchema);
export const Notification = model("Notification", notificationSchema);
export const AuditLog = model("AuditLog", auditSchema);
