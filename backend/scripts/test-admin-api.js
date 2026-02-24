#!/usr/bin/env node

/**
 * Script test login super admin và tạo admin/staff users
 * Chạy: node scripts/test-admin-api.js
 */

import "dotenv/config";
import http from "http";
import https from "https";

const API_URL = process.env.API_URL || "http://localhost:3000/api";

// Colors for console
const colors = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Simple fetch using native http/https
 */
async function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === "https:" ? https : http;

    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === "https:" ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || "GET",
      headers: options.headers || {},
    };

    const req = protocol.request(requestOptions, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          json: async () => JSON.parse(data),
        });
      });
    });

    req.on("error", reject);

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

async function testLogin(phone, password) {
  log("\n🔐 Testing login...", "blue");

  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, password }),
  });

  const data = await response.json();

  if (response.ok && data.success) {
    log("✅ Login successful!", "green");
    log(`   User: ${data.data.user.email}`, "green");
    log(`   Role: ${data.data.user.role}`, "green");
    log(
      `   User ID: ${data.data.user.user_id || data.data.user.customerId}`,
      "green",
    );
    return data.data.token;
  } else {
    log(`❌ Login failed: ${data.message}`, "red");
    return null;
  }
}

async function getAllUsers(token) {
  log("\n📋 Getting all users...", "blue");

  const response = await fetch(`${API_URL}/admin/users`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();

  if (response.ok && data.success) {
    const items = data.data?.items || [];
    log(`✅ Found ${items.length} users`, "green");
    items.forEach((user) => {
      const name = user.profile?.full_name || "N/A";
      log(`   - ${user.user_id}: ${name} (${user.role})`, "green");
    });
    return items;
  } else {
    log(`❌ Failed: ${data.message}`, "red");
    return null;
  }
}

async function createAdmin(token) {
  log("\n➕ Creating admin user...", "blue");

  const adminData = {
    full_name: "Test Admin",
    email: `admin_${Date.now()}@example.com`,
    phone: `090${Math.floor(1000000 + Math.random() * 9000000)}`,
    password: "TestAdmin123!",
    role: "admin",
  };

  const response = await fetch(`${API_URL}/admin/users`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(adminData),
  });

  const data = await response.json();

  if (response.ok && data.success) {
    log("✅ Admin created successfully!", "green");
    log(`   User ID: ${data.data.user_id}`, "green");
    log(`   Email: ${data.data.email}`, "green");
    log(`   Role: ${data.data.role}`, "green");
    return data.data;
  } else {
    log(`❌ Failed: ${data.message}`, "red");
    return null;
  }
}

async function createStaff(token) {
  log("\n➕ Creating staff user...", "blue");

  const staffData = {
    full_name: "Test Staff",
    email: `staff_${Date.now()}@example.com`,
    phone: `091${Math.floor(1000000 + Math.random() * 9000000)}`,
    password: "TestStaff123!",
    role: "staff",
  };

  const response = await fetch(`${API_URL}/admin/users`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(staffData),
  });

  const data = await response.json();

  if (response.ok && data.success) {
    log("✅ Staff created successfully!", "green");
    log(`   User ID: ${data.data.user_id}`, "green");
    log(`   Email: ${data.data.email}`, "green");
    log(`   Role: ${data.data.role}`, "green");
    return data.data;
  } else {
    log(`❌ Failed: ${data.message}`, "red");
    return null;
  }
}

async function updateUserRole(token, userId, newRole) {
  log(`\n🔄 Updating user ${userId} to role ${newRole}...`, "blue");

  const response = await fetch(`${API_URL}/admin/users/${userId}/role`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ role: newRole }),
  });

  const data = await response.json();

  if (response.ok && data.success) {
    log("✅ Role updated successfully!", "green");
    return data.data;
  } else {
    log(`❌ Failed: ${data.message}`, "red");
    return null;
  }
}

async function blockUser(token, userId) {
  log(`\n🚫 Blocking user ${userId}...`, "blue");

  const response = await fetch(`${API_URL}/admin/users/${userId}/status`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status: "blocked" }),
  });

  const data = await response.json();

  if (response.ok && data.success) {
    log("✅ User blocked successfully!", "green");
    return data.data;
  } else {
    log(`❌ Failed: ${data.message}`, "red");
    return null;
  }
}

async function main() {
  log("=".repeat(60), "yellow");
  log("🧪 ADMIN API TEST SUITE", "yellow");
  log("=".repeat(60), "yellow");

  try {
    // Test 1: Login as super admin
    const phone = process.env.SUPER_ADMIN_PHONE || "0935075947";
    const password = process.env.SUPER_ADMIN_PASSWORD || "StrongPassword123!";

    const token = await testLogin(phone, password);
    if (!token) {
      log("\n❌ Cannot proceed without valid token", "red");
      process.exit(1);
    }

    // Test 2: Get all users
    await getAllUsers(token);

    // Test 3: Create admin
    const admin = await createAdmin(token);

    // Test 4: Create staff
    const staff = await createStaff(token);

    // Test 5: Update staff role to admin (if created)
    if (staff) {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1s
      await updateUserRole(token, staff._id, "admin");
    }

    // Test 6: Block user (if admin created)
    if (admin) {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1s
      await blockUser(token, admin._id);
    }

    log("\n" + "=".repeat(60), "yellow");
    log("✅ ALL TESTS COMPLETED!", "green");
    log("=".repeat(60), "yellow");

    process.exit(0);
  } catch (error) {
    log(`\n❌ Test suite failed: ${error.message}`, "red");
    console.error(error);
    process.exit(1);
  }
}

main();
