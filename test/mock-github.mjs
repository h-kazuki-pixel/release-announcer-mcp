import http from "node:http";

const README = `# jp-dates-mcp-server

日本の祝日・和暦・日付情報をClaudeに提供するMCPサーバー。APIキー不要・完全オフライン。

## Setup

\`\`\`bash
npm install
npm run build
\`\`\`

## 使い方

Claude Desktopの設定に追加してください。

\`\`\`json
{ "mcpServers": { "jp-dates": { "command": "node", "args": ["dist/index.js"] } } }
\`\`\`
`;

export function startMockGitHub() {
  const server = http.createServer((req, res) => {
    const url = req.url || "";
    const json = (code, body) => {
      res.writeHead(code, { "Content-Type": "application/json" });
      res.end(JSON.stringify(body));
    };

    if (url === "/repos/h-kazuki-pixel/jp-dates-mcp-server") {
      return json(200, {
        full_name: "h-kazuki-pixel/jp-dates-mcp-server",
        description: "日本の祝日・和暦・日付情報をClaudeに提供するMCPサーバー",
        html_url: "https://github.com/h-kazuki-pixel/jp-dates-mcp-server",
        homepage: null,
        topics: ["mcp", "mcp-server", "claude", "japan"],
        stargazers_count: 12,
        license: { key: "mit", name: "MIT License" },
        default_branch: "main",
        language: "TypeScript",
      });
    }
    if (url === "/repos/h-kazuki-pixel/jp-dates-mcp-server/releases/latest") {
      return json(200, {
        tag_name: "v1.0.0",
        name: "v1.0.0",
        body: "Initial release: holidays, wareki (Japanese era) conversion, date info tools.",
        published_at: "2026-07-17T00:00:00Z",
        html_url: "https://github.com/h-kazuki-pixel/jp-dates-mcp-server/releases/tag/v1.0.0",
      });
    }
    if (url === "/repos/h-kazuki-pixel/jp-dates-mcp-server/readme") {
      return json(200, {
        content: Buffer.from(README, "utf-8").toString("base64"),
        encoding: "base64",
      });
    }
    if (url === "/repos/h-kazuki-pixel/jp-dates-mcp-server/contents/") {
      return json(200, [
        { name: "README.md", type: "file" },
        { name: "LICENSE", type: "file" },
        { name: ".gitignore", type: "file" },
        { name: "package.json", type: "file" },
        { name: "src", type: "dir" },
      ]);
    }
    // repo with missing pieces (for fail-path checks)
    if (url === "/repos/h-kazuki-pixel/bare-repo") {
      return json(200, {
        full_name: "h-kazuki-pixel/bare-repo",
        description: null,
        html_url: "https://github.com/h-kazuki-pixel/bare-repo",
        homepage: null,
        topics: [],
        stargazers_count: 0,
        license: null,
        default_branch: "main",
        language: null,
      });
    }
    if (url === "/repos/h-kazuki-pixel/bare-repo/releases/latest") return json(404, { message: "Not Found" });
    if (url === "/repos/h-kazuki-pixel/bare-repo/readme") return json(404, { message: "Not Found" });
    if (url === "/repos/h-kazuki-pixel/bare-repo/contents/") return json(200, [{ name: "main.py", type: "file" }]);

    return json(404, { message: "Not Found" });
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      resolve({ server, port: server.address().port });
    });
  });
}
