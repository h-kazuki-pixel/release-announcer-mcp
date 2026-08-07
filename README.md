# release-announcer-mcp

[![CI](https://github.com/h-kazuki-pixel/release-announcer-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/h-kazuki-pixel/release-announcer-mcp/actions/workflows/ci.yml)

An MCP server that turns a GitHub repository into ready-to-review release announcements — and checks that the repo is actually ready to ship.

Point it at any public repo and ask Claude for an "announcement kit". You get drafts for:

- **X/Twitter post** (short, link included, in two languages)
- **Reddit post** (understated "I built a thing" tone — draft only, never auto-posted)
- **GitHub profile README table row**
- **awesome-list entry + pull request text**
- **MCP directory listing** (short/long description + tags)

Plus a **publish-readiness checklist**: LICENSE, README quality, Release, Topics, About description, .gitignore — each with a concrete fix suggestion when missing.

No API key required. Works with any public GitHub repository.

## Why

If you ship open-source tools on a regular cadence, the release itself is the easy part. The repetitive part is everything after: writing the announcement, adapting it per platform, updating your profile, submitting to directories. This server gathers the facts (README, release notes, metadata) and hands your LLM a strict writing brief, so every announcement is accurate, consistent, and takes minutes instead of an hour.

By design, this tool **generates drafts only**. It never posts anywhere. You review, then you post.

## Tools

| Tool | What it does |
|---|---|
| `fetch_repo_info` | Fetch repo metadata, latest release, README, and root files |
| `check_publish_readiness` | Run the pre-publication checklist (pass/warn/fail with fixes) |
| `build_announcement_brief` | Build a complete writing brief for any subset of announcement targets |

## Setup

Requires Node.js 18+.

```bash
git clone https://github.com/h-kazuki-pixel/release-announcer-mcp.git
cd release-announcer-mcp
npm install
npm run build
```

Add to your Claude Desktop config (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "release-announcer": {
      "command": "node",
      "args": ["/absolute/path/to/release-announcer-mcp/dist/index.js"]
    }
  }
}
```

`claude_desktop_config.json` is at:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

### GitHub API rate limit

Unauthenticated GitHub API requests are capped at 60 per hour per IP address, and building one announcement kit makes several of them. A token raises the cap to 5,000 per hour.

Put the token in the `env` block of the config file. **Do not export it in your shell** — Claude Desktop starts MCP servers without inheriting the shell environment, so an exported variable never reaches this server.

```json
{
  "mcpServers": {
    "release-announcer": {
      "command": "node",
      "args": ["/absolute/path/to/release-announcer-mcp/dist/index.js"],
      "env": { "GITHUB_TOKEN": "ghp_..." }
    }
  }
}
```

The token needs no scopes. This server only reads public repositories.

### Docker (optional)

The repository ships a `Dockerfile` (Node 20 slim, multi-stage build) for running the server in a container. The Claude Desktop setup above does not need it.

```bash
docker build -t release-announcer-mcp .
```

## Usage

Just ask Claude, for example:

> "Build the announcement kit for h-kazuki-pixel/jp-dates-mcp-server"

> "Is my-org/my-repo ready to publish? Run the checklist."

> "Draft only the X post and the awesome-list entry for owner/repo."

## Example output (checklist)

```
# Publish readiness: owner/repo

**6/8 checks passed**

- ✅ LICENSE file — MIT License detected.
- ✅ README — README found.
- ⚠️ README: setup instructions — No obvious setup section. Add installation steps.
- ✅ README: usage examples — Usage/example content detected.
- ❌ GitHub Release — No release found. Create one: Releases → 'Draft a new release' → tag v1.0.0.
- ✅ Topics (discovery tags) — 4 topics set.
- ✅ About description — Description set.
- ✅ .gitignore — .gitignore found.
```

## Development

```bash
npm run build   # compile TypeScript
npm test        # run integration tests (uses a local mock of the GitHub API)
```

## License

MIT

---

# 日本語

GitHubリポジトリを指定するだけで、リリース告知に必要な文章一式のドラフトと、公開前チェックリストを生成するMCPサーバーです。

## できること

- **X(Twitter)告知文**(2言語・リンク付き・短文)
- **Reddit投稿の下書き**(宣伝色を抑えた文体。自動投稿は一切しません)
- **GitHubプロフィールREADMEの作品表の行**
- **awesomeリスト登録用のエントリ+PR文**
- **MCPディレクトリ(mcp.so等)登録用の説明文+タグ案**
- **公開前チェックリスト**: LICENSE / READMEの充実度 / Release作成 / Topics / About欄 / .gitignore を自動判定し、不足があれば直し方を提示

APIキー不要。公開リポジトリならどれでも使えます。

## セットアップ

Node.js 18以上が必要です。

```bash
git clone https://github.com/h-kazuki-pixel/release-announcer-mcp.git
cd release-announcer-mcp
npm install
npm run build
```

Claude Desktopの設定ファイル(`claude_desktop_config.json`)に追加:

```json
{
  "mcpServers": {
    "release-announcer": {
      "command": "node",
      "args": ["/absolute/path/to/release-announcer-mcp/dist/index.js"]
    }
  }
}
```
`claude_desktop_config.json` の場所:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

### GitHub APIのレート上限

未認証のGitHub APIはIPアドレスあたり1時間60リクエストに制限されており、告知セットを1回作るだけで複数回叩きます。トークンを設定すると1時間5,000リクエストに上がります。

トークンは設定ファイルの `env` ブロックに書いてください。**シェルで `export` しても届きません。** Claude Desktop はMCPサーバーを、シェルの環境変数を引き継がない形で起動するためです。

```json
{
  "mcpServers": {
    "release-announcer": {
      "command": "node",
      "args": ["/absolute/path/to/release-announcer-mcp/dist/index.js"],
      "env": { "GITHUB_TOKEN": "ghp_..." }
    }
  }
}
```

トークンに権限(スコープ)の付与は不要です。このサーバーは公開リポジトリの読み取りしか行いません。

### Docker(任意)

このリポジトリには `Dockerfile`(Node 20 slim・マルチステージ構成)が同梱されています。コンテナで動かしたい場合に使います。上のClaude Desktopの手順では不要です。

```bash
docker build -t release-announcer-mcp .
```

## 使い方

Claudeにこう頼むだけです:

> 「h-kazuki-pixel/jp-dates-mcp-server の告知セットを作って」

> 「owner/repo は公開準備できてる?チェックリストを実行して」

## 設計方針

このツールが生成するのは**下書きのみ**です。SNSへの自動投稿機能は意図的に持たせていません。最終確認と投稿は必ず人間が行います。

## ライセンス

MIT
