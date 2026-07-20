import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { startMockGitHub } from "./mock-github.mjs";

const { server: mockServer, port } = await startMockGitHub();

const OWNER = "h-kazuki-pixel";
const REPO = "jp-dates-mcp-server";

let failures = 0;
function check(name, cond, extra = "") {
  if (cond) console.log(`PASS: ${name}`);
  else {
    failures++;
    console.log(`FAIL: ${name} ${extra}`);
  }
}

const client = new Client({ name: "test-client", version: "1.0.0" });
await client.connect(
  new StdioClientTransport({
    command: "node",
    args: ["dist/index.js"],
    env: { ...process.env, GITHUB_API_BASE: `http://127.0.0.1:${port}` },
  })
);

// 1. Tool listing
const { tools } = await client.listTools();
const names = tools.map((t) => t.name).sort();
check(
  "three tools registered",
  JSON.stringify(names) ===
    JSON.stringify(["build_announcement_brief", "check_publish_readiness", "fetch_repo_info"]),
  JSON.stringify(names)
);

// 2. fetch_repo_info
const info = await client.callTool({
  name: "fetch_repo_info",
  arguments: { owner: OWNER, repo: REPO },
});
const infoText = info.content?.[0]?.text ?? "";
check("fetch_repo_info returns repo url", infoText.includes(`github.com/${OWNER}/${REPO}`));
check("fetch_repo_info includes readme", infoText.length > 500);
check("fetch_repo_info not error", !info.isError);

// 3. check_publish_readiness
const readiness = await client.callTool({
  name: "check_publish_readiness",
  arguments: { owner: OWNER, repo: REPO },
});
const rText = readiness.content?.[0]?.text ?? "";
check("readiness has header", rText.includes("Publish readiness"));
check("readiness has checklist items", rText.includes("LICENSE") && rText.includes("Topics"));
console.log("--- readiness report ---\n" + rText + "\n---");

// 4. build_announcement_brief (all targets)
const brief = await client.callTool({
  name: "build_announcement_brief",
  arguments: { owner: OWNER, repo: REPO },
});
const bText = brief.content?.[0]?.text ?? "";
check("brief has source material", bText.includes("Source material"));
for (const t of ["X (Twitter)", "Reddit post draft", "profile README", "awesome-mcp", "MCP directory"]) {
  check(`brief includes target: ${t}`, bText.includes(t));
}
check("brief includes safety rule", bText.includes("NEVER include personal names"));

// 5. brief with subset of targets
const brief2 = await client.callTool({
  name: "build_announcement_brief",
  arguments: { owner: OWNER, repo: REPO, targets: ["x_post"] },
});
const b2 = brief2.content?.[0]?.text ?? "";
check("subset brief has x_post only", b2.includes("X (Twitter)") && !b2.includes("Reddit post draft"));

// 6. error handling: nonexistent repo
const err = await client.callTool({
  name: "fetch_repo_info",
  arguments: { owner: OWNER, repo: "definitely-not-a-real-repo-xyz" },
});
check("404 handled as clear error", err.isError === true && (err.content?.[0]?.text ?? "").includes("Not found"));

// 7. input validation: empty owner rejected
let validationRejected = false;
try {
  const bad = await client.callTool({ name: "fetch_repo_info", arguments: { owner: "", repo: "x" } });
  validationRejected = bad.isError === true;
} catch {
  validationRejected = true;
}
check("empty owner rejected", validationRejected);

// 8. readiness fail-path on a bare repo
const bare = await client.callTool({
  name: "check_publish_readiness",
  arguments: { owner: OWNER, repo: "bare-repo" },
});
const bareText = bare.content?.[0]?.text ?? "";
check("bare repo flags missing license", bareText.includes("❌") && bareText.includes("No license detected"));
check("bare repo flags missing release", bareText.includes("No release found"));
check("bare repo flags missing readme", bareText.includes("No README found"));

await client.close();
mockServer.close();
console.log(failures === 0 ? "\nALL TESTS PASSED" : `\n${failures} TEST(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
