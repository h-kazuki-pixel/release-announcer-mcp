/**
 * Minimal GitHub REST API client (public data only, no auth required).
 * Optionally uses GITHUB_TOKEN env var for higher rate limits.
 */

const API_BASE = process.env.GITHUB_API_BASE || "https://api.github.com";
const README_CHAR_LIMIT = 12000;

export interface RepoInfo {
  fullName: string;
  description: string | null;
  htmlUrl: string;
  homepage: string | null;
  topics: string[];
  stars: number;
  license: { key: string; name: string } | null;
  defaultBranch: string;
  language: string | null;
}

export interface ReleaseInfo {
  tagName: string;
  name: string | null;
  body: string | null;
  publishedAt: string | null;
  htmlUrl: string;
}

export interface RepoBundle {
  repo: RepoInfo;
  latestRelease: ReleaseInfo | null;
  readme: string | null;
  readmeTruncated: boolean;
  rootFiles: string[];
}

class GitHubError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "GitHubError";
  }
}

async function ghFetch<T>(path: string): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "release-announcer-mcp",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { headers });
  } catch (e) {
    throw new GitHubError(
      `Network error while contacting GitHub API: ${e instanceof Error ? e.message : String(e)}. Check your internet connection and try again.`
    );
  }

  if (res.status === 404) {
    throw new GitHubError(
      `Not found: ${path}. Check that the owner/repo is spelled correctly and the repository is public.`,
      404
    );
  }
  if (res.status === 403 || res.status === 429) {
    throw new GitHubError(
      "GitHub API rate limit exceeded. Wait a few minutes and retry, or set the GITHUB_TOKEN environment variable to raise the limit.",
      res.status
    );
  }
  if (!res.ok) {
    throw new GitHubError(`GitHub API error ${res.status} for ${path}.`, res.status);
  }
  return (await res.json()) as T;
}

export async function getRepo(owner: string, repo: string): Promise<RepoInfo> {
  interface RawRepo {
    full_name: string;
    description: string | null;
    html_url: string;
    homepage: string | null;
    topics?: string[];
    stargazers_count: number;
    license: { key: string; name: string } | null;
    default_branch: string;
    language: string | null;
  }
  const r = await ghFetch<RawRepo>(`/repos/${owner}/${repo}`);
  return {
    fullName: r.full_name,
    description: r.description,
    htmlUrl: r.html_url,
    homepage: r.homepage,
    topics: r.topics ?? [],
    stars: r.stargazers_count,
    license: r.license ? { key: r.license.key, name: r.license.name } : null,
    defaultBranch: r.default_branch,
    language: r.language,
  };
}

export async function getLatestRelease(owner: string, repo: string): Promise<ReleaseInfo | null> {
  interface RawRelease {
    tag_name: string;
    name: string | null;
    body: string | null;
    published_at: string | null;
    html_url: string;
  }
  try {
    const r = await ghFetch<RawRelease>(`/repos/${owner}/${repo}/releases/latest`);
    return {
      tagName: r.tag_name,
      name: r.name,
      body: r.body,
      publishedAt: r.published_at,
      htmlUrl: r.html_url,
    };
  } catch (e) {
    if (e instanceof GitHubError && e.status === 404) return null; // no releases yet
    throw e;
  }
}

export async function getReadme(
  owner: string,
  repo: string
): Promise<{ text: string | null; truncated: boolean }> {
  interface RawContent {
    content?: string;
    encoding?: string;
  }
  try {
    const r = await ghFetch<RawContent>(`/repos/${owner}/${repo}/readme`);
    if (!r.content || r.encoding !== "base64") return { text: null, truncated: false };
    const text = Buffer.from(r.content, "base64").toString("utf-8");
    if (text.length > README_CHAR_LIMIT) {
      return { text: text.slice(0, README_CHAR_LIMIT), truncated: true };
    }
    return { text, truncated: false };
  } catch (e) {
    if (e instanceof GitHubError && e.status === 404) return { text: null, truncated: false };
    throw e;
  }
}

export async function getRootFiles(owner: string, repo: string): Promise<string[]> {
  interface RawEntry {
    name: string;
    type: string;
  }
  try {
    const entries = await ghFetch<RawEntry[]>(`/repos/${owner}/${repo}/contents/`);
    return entries.filter((e) => e.type === "file").map((e) => e.name);
  } catch (e) {
    if (e instanceof GitHubError && e.status === 404) return [];
    throw e;
  }
}

export async function getRepoBundle(owner: string, repo: string): Promise<RepoBundle> {
  const [repoInfo, latestRelease, readme, rootFiles] = await Promise.all([
    getRepo(owner, repo),
    getLatestRelease(owner, repo),
    getReadme(owner, repo),
    getRootFiles(owner, repo),
  ]);
  return {
    repo: repoInfo,
    latestRelease,
    readme: readme.text,
    readmeTruncated: readme.truncated,
    rootFiles,
  };
}

export { GitHubError };
