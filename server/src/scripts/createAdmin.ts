/**
 * Script to create an admin user
 *
 * Usage:
 *   npm run create:admin -- --email=admin@example.com --password=securepassword --name="Admin User"
 *
 * Or with prompts if no arguments provided:
 *   npm run create:admin
 */

import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import { User } from "../models/User";

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI is not set in .env");
  process.exit(1);
}

async function createAdmin() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  let email = "";
  let password = "";
  let displayName = "";

  for (const arg of args) {
    if (arg.startsWith("--email=")) {
      email = arg.replace("--email=", "");
    } else if (arg.startsWith("--password=")) {
      password = arg.replace("--password=", "");
    } else if (arg.startsWith("--name=")) {
      displayName = arg.replace("--name=", "");
    }
  }

  // If arguments not provided, use defaults for demo
  if (!email) {
    email = "admin@theveganaisle.app";
  }
  if (!password) {
    password = "admin123456";
  }
  if (!displayName) {
    displayName = "Admin";
  }

  console.log("🔧 Creating admin user...");
  console.log(`   Email: ${email}`);
  console.log(`   Display Name: ${displayName}`);
  console.log("");

  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    // Check if admin already exists
    const existingAdmin = await User.findOne({
      email: email.toLowerCase(),
    });

    if (existingAdmin) {
      console.log("⚠️  User with this email already exists.");

      // Update role to admin and reset password
      existingAdmin.role = "admin";
      existingAdmin.password = password;
      await existingAdmin.save();
      console.log("   Updated user role to admin and reset password.");
    } else {
      // Create new admin user
      const admin = await User.create({
        email: email.toLowerCase(),
        password,
        displayName,
        role: "admin",
      });

      console.log("✅ Admin user created successfully!");
      console.log(`   ID: ${admin._id}`);
      console.log(`   Email: ${admin.email}`);
      console.log(`   Role: ${admin.role}`);
    }

    console.log("\n📋 Admin login credentials:");
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(
      "\n⚠️  IMPORTANT: Change the password after first login in production!",
    );
  } catch (error) {
    console.error("❌ Error creating admin:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n✅ Done");
  }
}

createAdmin();
