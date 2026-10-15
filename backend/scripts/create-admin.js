import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
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

const User = mongoose.models.User || mongoose.model("User", userSchema);
const readline = createInterface({ input: stdin, output: stdout });

async function createAdmin() {
  if (!process.env.MONGODB_URI) {
    throw new Error(
      "MONGODB_URI is missing. Add your MongoDB Atlas connection string to backend/.env.",
    );
  }

  const email = (process.argv[2] || (await readline.question("Admin email: ")))
    .trim()
    .toLowerCase();
  const name = (
    process.argv[3] || (await readline.question("Admin full name: "))
  ).trim();
  const password =
    process.argv[4] ||
    (await readline.question("Admin password (12+ characters): "));

  if (!/^\S+@\S+\.\S+$/.test(email) || !name || password.length < 12) {
    throw new Error(
      "Provide a valid email, name, and password of at least 12 characters.",
    );
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
  });
  const existingAdmin = await User.findOne({ email });
  if (existingAdmin) {
    throw new Error("An account with this email already exists.");
  }

  await User.create({
    name,
    email,
    password_hash: await bcrypt.hash(password, 12),
    role: "admin",
  });

  console.log(`Admin account created for ${email}.`);
}

try {
  await createAdmin();
} catch (error) {
  console.error(`Could not create admin: ${error.message}`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect().catch(() => {});
  readline.close();
}
