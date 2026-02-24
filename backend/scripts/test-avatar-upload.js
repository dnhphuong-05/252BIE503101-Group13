/**
 * Test Avatar Upload Functionality
 *
 * This script tests the avatar upload feature
 * Run: node scripts/test-avatar-upload.js
 */

import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const API_URL = process.env.API_URL || "http://localhost:3000/api";
const TEST_EMAIL = process.env.TEST_EMAIL || "test@example.com";
const TEST_PASSWORD = process.env.TEST_PASSWORD || "password123";

// Colors for console output
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

async function login() {
  try {
    log("\n📝 Step 1: Login...", "blue");

    const response = await axios.post(`${API_URL}/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    if (!response.data.success) {
      throw new Error("Login failed");
    }

    const token = response.data.data.access_token;
    const user = response.data.data.user;

    log(`✅ Login successful!`, "green");
    log(`   User: ${user.email} (${user.user_id})`, "green");

    return { token, user };
  } catch (error) {
    log(
      `❌ Login failed: ${error.response?.data?.message || error.message}`,
      "red",
    );
    throw error;
  }
}

async function testInvalidUpload(token) {
  log("\n📝 Step 2: Test invalid upload (no file)...", "blue");

  try {
    const formData = new FormData();

    await axios.post(`${API_URL}/me/profile/avatar`, formData, {
      headers: {
        ...formData.getHeaders(),
        Authorization: `Bearer ${token}`,
      },
    });

    log("❌ Should have failed but succeeded", "red");
  } catch (error) {
    if (error.response?.status === 400) {
      log("✅ Correctly rejected: No file provided", "green");
    } else {
      log(
        `⚠️  Unexpected error: ${error.response?.data?.message || error.message}`,
        "yellow",
      );
    }
  }
}

async function testInvalidFileType(token) {
  log("\n📝 Step 3: Test invalid file type...", "blue");

  try {
    // Create a temporary text file
    const tempFile = path.join(__dirname, "temp-test.txt");
    fs.writeFileSync(tempFile, "This is not an image");

    const formData = new FormData();
    formData.append("avatar", fs.createReadStream(tempFile), {
      filename: "test.txt",
      contentType: "text/plain",
    });

    await axios.post(`${API_URL}/me/profile/avatar`, formData, {
      headers: {
        ...formData.getHeaders(),
        Authorization: `Bearer ${token}`,
      },
    });

    // Clean up
    fs.unlinkSync(tempFile);

    log("❌ Should have failed but succeeded", "red");
  } catch (error) {
    // Clean up
    const tempFile = path.join(__dirname, "temp-test.txt");
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }

    if (error.response?.status === 400) {
      log("✅ Correctly rejected: Invalid file type", "green");
    } else {
      log(
        `⚠️  Unexpected error: ${error.response?.data?.message || error.message}`,
        "yellow",
      );
    }
  }
}

async function testValidUpload(token) {
  log("\n📝 Step 4: Test valid upload...", "blue");

  try {
    // Create a simple 1x1 PNG image
    const pngBuffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
      0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
      0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
    ]);

    const tempFile = path.join(__dirname, "temp-test-avatar.png");
    fs.writeFileSync(tempFile, pngBuffer);

    const formData = new FormData();
    formData.append("avatar", fs.createReadStream(tempFile), {
      filename: "test-avatar.png",
      contentType: "image/png",
    });

    const response = await axios.post(
      `${API_URL}/me/profile/avatar`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          Authorization: `Bearer ${token}`,
        },
      },
    );

    // Clean up
    fs.unlinkSync(tempFile);

    if (response.data.success && response.data.data.avatar) {
      log("✅ Upload successful!", "green");
      log(`   Avatar URL: ${response.data.data.avatar}`, "green");

      // Check if URL is from Cloudinary
      if (response.data.data.avatar.includes("cloudinary.com")) {
        log("✅ Avatar stored on Cloudinary", "green");

        // Check if in correct folder
        if (response.data.data.avatar.includes("Home/vietphuc/avatars")) {
          log("✅ Avatar in correct folder: Home/vietphuc/avatars", "green");
        } else {
          log("⚠️  Avatar not in expected folder", "yellow");
        }
      } else {
        log("⚠️  Avatar URL is not from Cloudinary", "yellow");
      }

      return response.data.data.avatar;
    } else {
      log("❌ Upload failed: No avatar URL in response", "red");
    }
  } catch (error) {
    // Clean up
    const tempFile = path.join(__dirname, "temp-test-avatar.png");
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }

    log(
      `❌ Upload failed: ${error.response?.data?.message || error.message}`,
      "red",
    );

    if (error.response?.data) {
      log(
        `   Response: ${JSON.stringify(error.response.data, null, 2)}`,
        "red",
      );
    }
  }
}

async function verifyAvatarInProfile(token, expectedAvatar) {
  log("\n📝 Step 5: Verify avatar in profile...", "blue");

  try {
    const response = await axios.get(`${API_URL}/me/profile`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.data.success) {
      const avatar =
        response.data.data.avatar || response.data.data.profile?.avatar;

      if (avatar) {
        log("✅ Avatar found in profile", "green");
        log(`   Avatar URL: ${avatar}`, "green");

        if (expectedAvatar && avatar === expectedAvatar) {
          log("✅ Avatar matches uploaded URL", "green");
        } else if (expectedAvatar) {
          log("⚠️  Avatar URL does not match", "yellow");
        }

        return true;
      } else {
        log("❌ No avatar in profile", "red");
        return false;
      }
    }
  } catch (error) {
    log(
      `❌ Failed to get profile: ${error.response?.data?.message || error.message}`,
      "red",
    );
    return false;
  }
}

async function runTests() {
  log("🧪 Starting Avatar Upload Tests", "blue");
  log("================================\n", "blue");

  try {
    // Step 1: Login
    const { token, user } = await login();

    // Step 2: Test invalid upload
    await testInvalidUpload(token);

    // Step 3: Test invalid file type
    await testInvalidFileType(token);

    // Step 4: Test valid upload
    const avatarUrl = await testValidUpload(token);

    // Step 5: Verify avatar in profile
    if (avatarUrl) {
      await verifyAvatarInProfile(token, avatarUrl);
    }

    // Summary
    log("\n================================", "blue");
    log("✅ All tests completed!", "green");
    log("\nℹ️  Notes:", "blue");
    log("   - Make sure Cloudinary credentials are configured in .env", "blue");
    log("   - Check browser or Postman for real file uploads", "blue");
    log(`   - Avatar folder on Cloudinary: Home/vietphuc/avatars`, "blue");
  } catch (error) {
    log("\n================================", "red");
    log("❌ Tests failed!", "red");
    log(`   Error: ${error.message}`, "red");
    process.exit(1);
  }
}

// Run tests
runTests();
