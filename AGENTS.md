# Dhaka Date RPG — Workspace Rules

## Documentation & Coding Workflow
- **Always Check Context7 Before Coding**: Before writing or modifying code that uses any library, framework, or API (e.g., Phaser, Vite, Vitest, TypeScript, Cloudflare Wrangler, Vercel), query the `context7` MCP server for up-to-date documentation and examples:
  1. Call `resolve-library-id` on the `context7` MCP server (`call_mcp_tool` with `ServerName: "context7"`, `ToolName: "resolve-library-id"`) to resolve the official Context7 library ID (unless already known in `/org/project` format).
  2. Call `query-docs` on the `context7` MCP server (`call_mcp_tool` with `ServerName: "context7"`, `ToolName: "query-docs"`) with the resolved `libraryId` and specific topic query before implementing changes.
- **Synchronize `GAME_CONTEXT.md` After Major Design Edits**: Whenever implementing or modifying major game design elements (e.g., world coordinates, spatial layout/decongestion, NPC schedules and behaviors, cutscenes, audio/sound design, sprite sheet layouts, or gameplay mechanics), always update `GAME_CONTEXT.md` to keep world documentation strictly synchronized with the codebase.
- **Scoped Testing for 3D Mini-Game Features**:
  - When creating, tuning, or modifying 3D mini-game features (e.g., Three.js overlays, kart physics, track collision, AI drivers, HUD, 3D audio, and race renderers), do **not** run the entire suite of unrelated 2D or web tests (e.g., all NPC schedule validators, 2D action combat Playwright suites, farming tests, romance dialogue tests).
  - Focus testing strictly on the 3D subsystems and directly impacted modules:
    - 3D unit tests: `npx vitest run tests/race/`
    - 3D validation & simulation: `npm run race:validate`, `npm run race:simulate`
    - Race E2E verification: `npm run test:race:m*` (relevant milestone script)
    - TypeScript integrity: `npm run typecheck`
    - Production build verification: `npm run build`
  - Run full-game test suites (`npm test`, `validate:npc`, combat E2E) only during full-game release sweeps or when 2D overworld systems or shared core configurations are directly modified.
- **Mandatory Parallel Download System for External Assets**:
  - Whenever acquiring, importing, or fetching external assets (e.g., from GitHub, Kenney, Poly Pizza, or remote repositories), never use ad-hoc single-stream `curl`, unmanaged shell downloads, or raw single-connection `fetch()`.
  - Always route asset downloads through the existing parallel download manager:
    - **Offline scripts & Node pipelines**: Use `downloadFile` or `downloadParallel` from `scripts/lib/parallel-download.mjs`.
    - **Browser runtime & engine pipelines**: Use `ParallelDownloader` (`src/scenes/minigames/race/net/ParallelDownloader.ts`) for multi-channel chunked binary transfers.
  - Maintain security and integrity: ensure remote hosts are included in `DEFAULT_ALLOWED_HOSTS`, destination paths are validated within workspace boundaries, and downloaded assets are recorded with provenance credits in `ASSET_CREDITS.md`.

## Deployment & Infrastructure
- **Cloudflare Pages Deployment**: This project deploys to **Cloudflare Pages** (`moon-walkers-day`). All legacy Vercel links are permanently redirected (HTTP 308) to Cloudflare Pages (`https://moon-walkers-day.pages.dev`).
- **Secret & API Key Protection (Never Push Secrets)**:
  - Never hardcode API keys, tokens (`TELEGRAM_BOT_TOKEN`, Cloudflare tokens, etc.), or credentials in any source, config, or script file.
  - Before running `git add` / `git commit` / `git push`, always inspect `git status --short` and scan staged diffs (`git diff --cached`) to verify that no `.env*`, `.dev.vars`, `*.pem`, `*.key`, or secret strings are staged. If any secret is detected, unstage/redact it immediately before committing.
- **Mandatory Post-Edit Push & Deployment**: Every time you finish making any edit to the project (and verify the build passes), you **must** automatically:
  1. Verify no API keys or secrets are present in modified/untracked files, then stage, commit, and push the changes to **GitHub** (`git add -A && git commit -m "<descriptive message>" && git push`).
  2. Deploy to **Cloudflare Pages** (`npm run deploy:cf`).
- **Preserve Deployment Tooling**:
  - Do **not** remove `wrangler` from `devDependencies` or the `deploy:cf` script from `package.json`.
  - Preserve `vercel.json` as it maintains the permanent 308 redirects from legacy Vercel URLs to Cloudflare Pages.
  - Ensure build outputs (`dist/`) and asset paths remain fully optimized for Cloudflare Pages static hosting.
