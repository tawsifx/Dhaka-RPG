# Dhaka Date RPG — Workspace Rules

## Documentation & Coding Workflow
- **Always Check Context7 Before Coding**: Before writing or modifying code that uses any library, framework, or API (e.g., Phaser, Vite, Vitest, TypeScript, Cloudflare Wrangler, Vercel), query the `context7` MCP server for up-to-date documentation and examples:
  1. Call `resolve-library-id` on the `context7` MCP server (`call_mcp_tool` with `ServerName: "context7"`, `ToolName: "resolve-library-id"`) to resolve the official Context7 library ID (unless already known in `/org/project` format).
  2. Call `query-docs` on the `context7` MCP server (`call_mcp_tool` with `ServerName: "context7"`, `ToolName: "query-docs"`) with the resolved `libraryId` and specific topic query before implementing changes.

## Deployment & Infrastructure
- **Dual Deployment Targets**: This project deploys simultaneously to both **Vercel** and **Cloudflare Pages** (`moon-walkers-day`).
- **Mandatory Post-Edit Push & Deployment**: Every time you finish making any edit to the project (and verify the build passes), you **must** automatically:
  1. Stage, commit, and push the changes to **GitHub** (`git add -A && git commit -m "<descriptive message>" && git push`).
  2. Deploy to **Cloudflare Pages** (`npm run deploy:cf`).
  3. Deploy to **Vercel** (`npx vercel --prod --yes`).
- **Preserve Deployment Tooling**:
  - Do **not** remove `wrangler` from `devDependencies` or the `deploy:cf` script from `package.json`.
  - Do **not** remove `vercel.json` or the Vercel deployment pipeline in `telegram-bot.js`.
  - Ensure build outputs (`dist/`) and asset paths remain compatible with both Vercel and Cloudflare Pages static hosting.
