import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "../src/models.js";
const [, , name, email, password] = process.argv;
if (!name || !email || !password || password.length < 12) {
  console.error(
    'Usage: npm run create-admin -- "Admin Name" admin@example.com "A-long-password-12+"',
  );
  process.exit(1);
}
if (!process.env.MONGODB_URI) {
  console.error("MONGODB_URI is required in backend/.env");
  process.exit(1);
}
try {
  await mongoose.connect(process.env.MONGODB_URI);
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    console.error("An account already exists for this email.");
    process.exitCode = 1;
  } else {
    const user = await User.create({
      name,
      email,
      password_hash: await bcrypt.hash(password, 12),
      role: "admin",
    });
    console.log(`Admin created: ${user.email}`);
  }
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
