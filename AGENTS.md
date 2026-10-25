# Dhaka Date RPG — Workspace Rules

## Documentation & Coding Workflow
- **Always Check Context7 Before Coding**: Before writing or modifying code that uses any library, framework, or API (e.g., Phaser, Vite, Vitest, TypeScript, Cloudflare Wrangler, Vercel), query the `context7` MCP server for up-to-date documentation and examples:
  1. Call `resolve-library-id` on the `context7` MCP server (`call_mcp_tool` with `ServerName: "context7"`, `ToolName: "resolve-library-id"`) to resolve the official Context7 library ID (unless already known in `/org/project` format).
  2. Call `query-docs` on the `context7` MCP server (`call_mcp_tool` with `ServerName: "context7"`, `ToolName: "query-docs"`) with the resolved `libraryId` and specific topic query before implementing changes.
- **Synchronize `GAME_CONTEXT.md` After Major Design Edits**: Whenever implementing or modifying major game design elements (e.g., world coordinates, spatial layout/decongestion, NPC schedules and behaviors, cutscenes, audio/sound design, sprite sheet layouts, or gameplay mechanics), always update `GAME_CONTEXT.md` to keep world documentation strictly synchronized with the codebase.

## Deployment & Infrastructure
- **Dual Deployment Targets**: This project deploys simultaneously to both **Vercel** and **Cloudflare Pages** (`moon-walkers-day`).
- **Secret & API Key Protection (Never Push Secrets)**:
  - Never hardcode API keys, tokens (`TELEGRAM_BOT_TOKEN`, Cloudflare/Vercel tokens, etc.), or credentials in any source, config, or script file.
  - Before running `git add` / `git commit` / `git push`, always inspect `git status --short` and scan staged diffs (`git diff --cached`) to verify that no `.env*`, `.dev.vars`, `*.pem`, `*.key`, or secret strings are staged. If any secret is detected, unstage/redact it immediately before committing.
- **Mandatory Post-Edit Push & Deployment**: Every time you finish making any edit to the project (and verify the build passes), you **must** automatically:
  1. Verify no API keys or secrets are present in modified/untracked files, then stage, commit, and push the changes to **GitHub** (`git add -A && git commit -m "<descriptive message>" && git push`).
  2. Deploy to **Cloudflare Pages** (`npm run deploy:cf`).
  3. Deploy to **Vercel** (`npx vercel --prod --yes`).
- **Preserve Deployment Tooling**:
  - Do **not** remove `wrangler` from `devDependencies` or the `deploy:cf` script from `package.json`.
  - Do **not** remove `vercel.json` or the Vercel deployment pipeline in `telegram-bot.js`.
  - Ensure build outputs (`dist/`) and asset paths remain compatible with both Vercel and Cloudflare Pages static hosting.
