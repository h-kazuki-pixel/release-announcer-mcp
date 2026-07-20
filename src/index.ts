#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { getRepoBundle, GitHubError } from "./services/github.js";
import { buildReadinessReport, formatReadinessMarkdown } from "./services/readiness.js";
import { buildBrief, ALL_TARGETS, type BriefTarget } from "./services/brief.js";

const server = new McpServer({
  name: "release-announcer-mcp",
  version: "1.0.0",
});

const RepoInput = {
  owner: z
    .string()
    .min(1)
    .max(100)
    .describe("GitHub user or organization name, e.g. 'h-kazuki-pixel'"),
  repo: z
    .string()
    .min(1)
    .max(150)
    .describe("Repository name, e.g. 'jp-dates-mcp-server'"),
};

function errorResult(e: unknown): { content: { type: "text"; text: string }[]; isError: true } {
  const msg =
    e instanceof GitHubError
      ? e.message
      : `Unexpected error: ${e instanceof Error ? e.message : String(e)}`;
  return { content: [{ type: "text", text: `Error: ${msg}` }], isError: true };
}

server.registerTool(
  "fetch_repo_info",
  {
    title: "Fetch repository info",
    description: `Fetch public information about a GitHub repository: description, topics, license, stars, latest release (tag + notes), README content, and root file list.

Use this when you need raw facts about a repository before writing about it or checking it.

Args:
  - owner (string): GitHub user/org name
  - repo (string): repository name

Returns: structured JSON with repo metadata, latestRelease (or null), readme text (truncated at 12000 chars), and rootFiles.

Errors: returns a clear message for unknown repos (404) and API rate limits (retry later or set GITHUB_TOKEN env var).`,
    inputSchema: RepoInput,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  async ({ owner, repo }) => {
    try {
      const bundle = await getRepoBundle(owner, repo);
      return {
        content: [{ type: "text", text: JSON.stringify(bundle, null, 2) }],
        structuredContent: bundle as unknown as Record<string, unknown>,
      };
    } catch (e) {
      return errorResult(e);
    }
  }
);

server.registerTool(
  "check_publish_readiness",
  {
    title: "Check publish readiness",
    description: `Run a pre-publication checklist against a public GitHub repository and report pass/warn/fail per item.

Checks: LICENSE present (MIT expected), README present with setup instructions and usage examples, GitHub Release created, 3+ Topics set, About description set, .gitignore present.

Args:
  - owner (string): GitHub user/org name
  - repo (string): repository name

Returns: a Markdown checklist report plus structured JSON ({ repo, passed, total, items: [{id, label, status, detail}] }). Each failing item includes a concrete fix suggestion.`,
    inputSchema: RepoInput,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  async ({ owner, repo }) => {
    try {
      const bundle = await getRepoBundle(owner, repo);
      const report = buildReadinessReport(bundle);
      return {
        content: [{ type: "text", text: formatReadinessMarkdown(report) }],
        structuredContent: report as unknown as Record<string, unknown>,
      };
    } catch (e) {
      return errorResult(e);
    }
  }
);

server.registerTool(
  "build_announcement_brief",
  {
    title: "Build announcement brief",
    description: `Gather a repository's facts (README, latest release notes, metadata) and return a complete writing brief: source material plus strict per-target writing instructions. The calling LLM then writes the final draft texts from this brief.

Targets available:
  - x_post: X/Twitter announcement (Japanese + English, ~160 chars)
  - reddit_draft: understated Reddit post draft (English, title + body)
  - profile_readme_row: GitHub profile README table row
  - awesome_mcp_pr: awesome-mcp list entry + PR title/body
  - directory_listing: MCP directory (mcp.so etc.) descriptions + tags

Args:
  - owner (string): GitHub user/org name
  - repo (string): repository name
  - targets (string[], optional): subset of targets; defaults to all five

Returns: a Markdown brief. After calling this tool, write the requested draft texts following the brief's rules exactly. All output is draft-only for human review — never post anywhere automatically.`,
    inputSchema: {
      ...RepoInput,
      targets: z
        .array(z.enum(["x_post", "reddit_draft", "profile_readme_row", "awesome_mcp_pr", "directory_listing"]))
        .min(1)
        .optional()
        .describe("Which announcement targets to include (default: all)"),
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  async ({ owner, repo, targets }) => {
    try {
      const bundle = await getRepoBundle(owner, repo);
      const chosen: BriefTarget[] = targets && targets.length ? targets : ALL_TARGETS;
      return {
        content: [{ type: "text", text: buildBrief(bundle, chosen) }],
      };
    } catch (e) {
      return errorResult(e);
    }
  }
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("release-announcer-mcp running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
