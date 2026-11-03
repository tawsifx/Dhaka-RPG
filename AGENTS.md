# Dhaka Date RPG — Workspace Rules

## Documentation & Coding Workflow
- **Always Check Context7 Before Coding**: Before writing or modifying code that uses any library, framework, or API (e.g., Phaser, Vite, Vitest, TypeScript, Cloudflare Wrangler, Vercel), query the `context7` MCP server for up-to-date documentation and examples:
  1. Call `resolve-library-id` on the `context7` MCP server (`call_mcp_tool` with `ServerName: "context7"`, `ToolName: "resolve-library-id"`) to resolve the official Context7 library ID (unless already known in `/org/project` format).
  2. Call `query-docs` on the `context7` MCP server (`call_mcp_tool` with `ServerName: "context7"`, `ToolName: "query-docs"`) with the resolved `libraryId` and specific topic query before implementing changes.
- **Synchronize `GAME_CONTEXT.md` After Major Design Edits**: Whenever implementing or modifying major game design elements (e.g., world coordinates, spatial layout/decongestion, NPC schedules and behaviors, cutscenes, audio/sound design, sprite sheet layouts, or gameplay mechanics), always update `GAME_CONTEXT.md` to keep world documentation strictly synchronized with the codebase.
- **3D Mini-Game (MarioKart64JS)**:
  - The 3D kart racing mini-game is cloned directly from MarioKart64JS (`/race.html`, `src/scenes/minigames/race/`).
  - Standard verification for any changes to 3D race integration relies on TypeScript check (`npm run typecheck`) and production build verification (`npm run build`). No milestone-specific unit/E2E testing suites are required.
- **Mandatory Parallel Download System for External Assets**:
  - Whenever acquiring, importing, or fetching external assets (e.g., from SuperTuxKart SVN, GitHub, Kenney, or remote repositories), never use ad-hoc single-stream `curl`, unmanaged shell downloads, or raw single-connection `fetch()`.
  - Always route asset downloads through the existing parallel download manager:
    - **Offline scripts & Node pipelines**: Use `downloadFile` or `downloadParallel` from `scripts/lib/parallel-download.mjs`, or add candidate assets to `scripts/race/stk/fetch-stk.mjs` (`STK_FETCH_MANIFEST`).
    - **Browser runtime & engine pipelines**: Use `ParallelDownloader` (`src/scenes/minigames/race/net/ParallelDownloader.ts`) for multi-channel chunked binary transfers.
  - Maintain security and integrity: ensure remote hosts are included in `DEFAULT_ALLOWED_HOSTS`, destination paths are validated within workspace boundaries, and downloaded assets are recorded with provenance credits in `ASSET_CREDITS.md`.

## Deployment & Infrastructure
- **Primary Deployment Target**: This project deploys exclusively to **Cloudflare Pages** (`moon-walkers-day`). Do not deploy to Vercel.
- **Secret & API Key Protection (Never Push Secrets)**:
  - Never hardcode API keys, tokens (`TELEGRAM_BOT_TOKEN`, Cloudflare tokens, etc.), or credentials in any source, config, or script file.
  - Before running `git add` / `git commit` / `git push`, always inspect `git status --short` and scan staged diffs (`git diff --cached`) to verify that no `.env*`, `.dev.vars`, `*.pem`, `*.key`, or secret strings are staged. If any secret is detected, unstage/redact it immediately before committing.
- **Mandatory Post-Edit Push & Deployment**: Every time you finish making any edit to the project (and verify the build passes), you **must** automatically:
  1. Verify no API keys or secrets are present in modified/untracked files, then stage, commit, and push the changes to **GitHub** (`git add -A && git commit -m "<descriptive message>" && git push`).
  2. Deploy to **Cloudflare Pages** (`npm run deploy:cf`).
- **Preserve Deployment Tooling**:
  - Do **not** remove `wrangler` from `devDependencies` or the `deploy:cf` script from `package.json`.
  - Ensure build outputs (`dist/`) and asset paths remain compatible with Cloudflare Pages static hosting.
