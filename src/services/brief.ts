import type { RepoBundle } from "./github.js";

export type BriefTarget =
  | "x_post"
  | "reddit_draft"
  | "profile_readme_row"
  | "awesome_mcp_pr"
  | "directory_listing";

export const ALL_TARGETS: BriefTarget[] = [
  "x_post",
  "reddit_draft",
  "profile_readme_row",
  "awesome_mcp_pr",
  "directory_listing",
];

const GUIDELINES: Record<BriefTarget, string> = {
  x_post: `## Target: X (Twitter) announcement post
Produce TWO versions: one in Japanese, one in English.
Rules:
- Aim for ~160 characters of body text (excluding the URL); hard limit 280.
- Include the repository URL at the end.
- Lead with the concrete problem the tool solves, not the tool name.
- 1-2 relevant hashtags maximum (e.g. #MCP #ClaudeAI). No hashtag spam.
- No emojis beyond 0-2. No exclamation-mark overload.
- Tone: builder sharing work, not marketer selling.`,

  reddit_draft: `## Target: Reddit post draft (English)
Produce: one title + one body.
Rules:
- Title: plain and specific, "Show and tell" style (e.g. "I built an MCP server that ..."). No clickbait, no superlatives.
- Body: 3-6 short paragraphs. Structure: what it does → why I built it → how it works (1-2 technical details) → link → invite feedback/questions.
- Understated tone. Write as a developer sharing a side project, not promoting a product.
- Exactly one link (the GitHub repo). No calls to action like "check it out!" — instead end with a genuine question inviting discussion.
- This is a DRAFT for human review. Never post automatically.`,

  profile_readme_row: `## Target: GitHub profile README table row
Produce: one Markdown table row matching this column layout:
| [repo-name](repo-url) | one-line description (Japanese) | status emoji + version |
Example:
| [jp-dates-mcp-server](https://github.com/owner/repo) | 日本の祝日・和暦・日付情報をClaudeに提供するMCPサーバー。APIキー不要・完全オフライン | ✅ v1.0.0 |
Rules:
- Description in Japanese, one line, mention the key differentiator (e.g. "APIキー不要").
- Also produce the same row with an English description as an alternative.`,

  awesome_mcp_pr: `## Target: awesome-mcp list pull request (English)
Produce three parts:
1. List entry line in the common awesome-list format:
   - [repo-name](repo-url) - One-line description ending with a period.
   (Description: sentence case, starts with a verb or noun phrase, <= 100 chars, factual, no marketing words like "awesome/powerful/blazing".)
2. PR title: "Add repo-name" or similar minimal form.
3. PR body: 2-4 sentences. What the server does, language/stack, license, and confirmation it follows the list's contribution guidelines. Polite, brief.`,

  directory_listing: `## Target: MCP directory listing (e.g. mcp.so)
Produce:
1. Short description (<= 160 chars, English): what it does + key differentiator.
2. Long description (3-5 sentences, English): capabilities, setup in one line, license.
3. Suggested tags: 4-8 lowercase keywords (e.g. mcp, claude, dates, japan, offline).`,
};

const COMMON_RULES = `## Common rules (apply to ALL targets)
- NEVER invent features. Only describe what the README / release notes state.
- NEVER include personal names, company names, other project names, or credentials. The author is an anonymous developer.
- If the release notes are empty, base the text on the README only and say what the tool does (not "what changed").
- Output each target's text under a clear heading so the human can copy-paste each piece separately.
- All output is a DRAFT: the human reviews and posts manually.`;

export function buildBrief(bundle: RepoBundle, targets: BriefTarget[]): string {
  const { repo, latestRelease, readme, readmeTruncated } = bundle;

  const material = [
    `# Announcement brief for ${repo.fullName}`,
    "",
    "## Source material (facts — do not go beyond these)",
    `- Repository: ${repo.htmlUrl}`,
    `- About description: ${repo.description ?? "(not set)"}`,
    `- Primary language: ${repo.language ?? "(unknown)"}`,
    `- License: ${repo.license?.name ?? "(none detected)"}`,
    `- Topics: ${repo.topics.length ? repo.topics.join(", ") : "(none)"}`,
    `- Stars: ${repo.stars}`,
    latestRelease
      ? `- Latest release: ${latestRelease.tagName}${latestRelease.name ? ` "${latestRelease.name}"` : ""} (${latestRelease.publishedAt ?? "no date"})`
      : "- Latest release: (no release found)",
    "",
    "### Release notes",
    latestRelease?.body?.trim() ? latestRelease.body.trim() : "(empty)",
    "",
    "### README" + (readmeTruncated ? " (truncated)" : ""),
    readme ?? "(no README found)",
    "",
    COMMON_RULES,
    "",
    "# Writing instructions per target",
    "",
  ];

  for (const t of targets) {
    material.push(GUIDELINES[t], "");
  }

  material.push(
    "# Task",
    "Using ONLY the source material above, write the final draft text for each target listed, following its rules exactly."
  );

  return material.join("\n");
}
