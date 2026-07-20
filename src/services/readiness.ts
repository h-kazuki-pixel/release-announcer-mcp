import type { RepoBundle } from "./github.js";

export interface CheckItem {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail";
  detail: string;
}

export interface ReadinessReport {
  repo: string;
  passed: number;
  total: number;
  items: CheckItem[];
}

function hasHeadingLike(readme: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(readme));
}

export function buildReadinessReport(bundle: RepoBundle): ReadinessReport {
  const items: CheckItem[] = [];
  const { repo, latestRelease, readme, rootFiles } = bundle;
  const lowerFiles = rootFiles.map((f) => f.toLowerCase());

  // 1. LICENSE
  if (repo.license) {
    const isMit = repo.license.key === "mit";
    items.push({
      id: "license",
      label: "LICENSE file",
      status: isMit ? "pass" : "warn",
      detail: isMit
        ? "MIT License detected."
        : `License detected (${repo.license.name}) but it is not MIT. Confirm this is intentional.`,
    });
  } else {
    items.push({
      id: "license",
      label: "LICENSE file",
      status: "fail",
      detail: "No license detected. Add a LICENSE file (MIT) to the repository root.",
    });
  }

  // 2. README exists
  if (!readme) {
    items.push({
      id: "readme",
      label: "README",
      status: "fail",
      detail: "No README found. Add a README.md with features, setup steps, and usage examples.",
    });
  } else {
    items.push({ id: "readme", label: "README", status: "pass", detail: "README found." });

    // 2a. Setup instructions
    const hasSetup = hasHeadingLike(readme, [
      /#+.*(setup|install|installation|セットアップ|インストール|導入)/i,
      /npm (install|i)\b/,
      /npx /,
    ]);
    items.push({
      id: "readme_setup",
      label: "README: setup instructions",
      status: hasSetup ? "pass" : "warn",
      detail: hasSetup
        ? "Setup/installation section detected."
        : "No obvious setup section. Add installation steps (e.g. a 'Setup' heading with commands).",
    });

    // 2b. Usage examples
    const hasUsage = hasHeadingLike(readme, [
      /#+.*(usage|example|使い方|使用例|クイックスタート|quick\s*start)/i,
    ]);
    const hasCodeBlock = /```/.test(readme);
    items.push({
      id: "readme_usage",
      label: "README: usage examples",
      status: hasUsage || hasCodeBlock ? "pass" : "warn",
      detail:
        hasUsage || hasCodeBlock
          ? "Usage/example content detected."
          : "No usage examples found. Add an example section showing the tool in action.",
    });
  }

  // 3. Release
  if (latestRelease) {
    items.push({
      id: "release",
      label: "GitHub Release",
      status: "pass",
      detail: `Latest release: ${latestRelease.tagName}${latestRelease.name ? ` (${latestRelease.name})` : ""}.`,
    });
  } else {
    items.push({
      id: "release",
      label: "GitHub Release",
      status: "fail",
      detail:
        "No release found. Create one on GitHub: Releases → 'Draft a new release' → tag v1.0.0.",
    });
  }

  // 4. Topics
  if (repo.topics.length >= 3) {
    items.push({
      id: "topics",
      label: "Topics (discovery tags)",
      status: "pass",
      detail: `${repo.topics.length} topics set: ${repo.topics.join(", ")}.`,
    });
  } else {
    items.push({
      id: "topics",
      label: "Topics (discovery tags)",
      status: repo.topics.length > 0 ? "warn" : "fail",
      detail:
        repo.topics.length > 0
          ? `Only ${repo.topics.length} topic(s) set (${repo.topics.join(", ")}). Aim for 3+ (e.g. mcp, mcp-server, claude, typescript).`
          : "No topics set. Add topics in the repo's About section (e.g. mcp, mcp-server, claude).",
    });
  }

  // 5. About description
  if (repo.description && repo.description.trim().length > 0) {
    items.push({
      id: "description",
      label: "About description",
      status: "pass",
      detail: `Description set: "${repo.description}"`,
    });
  } else {
    items.push({
      id: "description",
      label: "About description",
      status: "fail",
      detail: "No About description. Add a one-line description in the repo's About section.",
    });
  }

  // 6. .gitignore
  const hasGitignore = lowerFiles.includes(".gitignore");
  items.push({
    id: "gitignore",
    label: ".gitignore",
    status: hasGitignore ? "pass" : "warn",
    detail: hasGitignore
      ? ".gitignore found."
      : "No .gitignore in repo root. Add one (at minimum: node_modules/, dist/, .env).",
  });

  const passed = items.filter((i) => i.status === "pass").length;
  return { repo: repo.fullName, passed, total: items.length, items };
}

export function formatReadinessMarkdown(report: ReadinessReport): string {
  const icon = { pass: "✅", warn: "⚠️", fail: "❌" } as const;
  const lines = [
    `# Publish readiness: ${report.repo}`,
    "",
    `**${report.passed}/${report.total} checks passed**`,
    "",
  ];
  for (const item of report.items) {
    lines.push(`- ${icon[item.status]} **${item.label}** — ${item.detail}`);
  }
  return lines.join("\n");
}
