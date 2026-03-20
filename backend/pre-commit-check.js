import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const REPO_ROOT = path.resolve(process.cwd(), "..");
const MAX_FILE_SIZE_BYTES = 1024 * 1024 * 2; // 2MB

const riskPatterns = [
  {
    label: "Private key block",
    regex: /-----BEGIN (RSA|EC|OPENSSH|DSA|PRIVATE) KEY-----/g,
  },
  {
    label: "AWS access key",
    regex: /\bAKIA[0-9A-Z]{16}\b/g,
  },
  {
    label: "GitHub personal token",
    regex: /\bghp_[A-Za-z0-9]{36}\b/g,
  },
  {
    label: "Google API key",
    regex: /\bAIza[0-9A-Za-z\-_]{35}\b/g,
  },
  {
    label: "MongoDB URI with inline credentials",
    regex: /\bmongodb\+srv:\/\/[^:\s]+:[^@\s]+@/g,
  },
  {
    label: "Merge conflict marker",
    regex: /^(<<<<<<<|=======|>>>>>>>)\s/mg,
  },
];

const getChangedFiles = () => {
  const commands = [
    "git diff --cached --name-only",
    "git diff --name-only",
  ];

  for (const command of commands) {
    const output = execSync(command, { cwd: REPO_ROOT, encoding: "utf8" })
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (output.length > 0) {
      return Array.from(new Set(output));
    }
  }

  return [];
};

const isProbablyText = (content) => !content.includes("\u0000");

const run = () => {
  const files = getChangedFiles();

  if (!files.length) {
    console.log("check:security: no changed files detected, skipped.");
    return;
  }

  const findings = [];

  for (const relativeFile of files) {
    const absoluteFile = path.resolve(REPO_ROOT, relativeFile);
    if (!fs.existsSync(absoluteFile)) continue;

    const stat = fs.statSync(absoluteFile);
    if (!stat.isFile()) continue;
    if (stat.size > MAX_FILE_SIZE_BYTES) continue;

    const content = fs.readFileSync(absoluteFile, "utf8");
    if (!isProbablyText(content)) continue;

    for (const pattern of riskPatterns) {
      pattern.regex.lastIndex = 0;
      const match = pattern.regex.exec(content);
      if (!match) continue;

      findings.push({
        file: relativeFile,
        label: pattern.label,
        snippet: match[0].slice(0, 120),
      });
    }
  }

  if (findings.length > 0) {
    console.error("check:security failed. Potential risky content found:");
    findings.forEach((finding, index) => {
      console.error(
        `${index + 1}. [${finding.label}] ${finding.file} -> ${finding.snippet}`,
      );
    });
    process.exit(1);
  }

  console.log(`check:security passed (${files.length} changed files scanned).`);
};

try {
  run();
} catch (error) {
  console.error("check:security failed with runtime error:", error.message);
  process.exit(1);
}
