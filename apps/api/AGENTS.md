<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Backend do monorepo

Este aplicativo contém a API REST Next.js do portal. Consulte `../../CLAUDE.md` e `../../specs/portal-inmobiliario/` antes de alterar funcionalidades.

- Organize Route Handlers em `src/app/api`, regras de negócio em `src/services` e persistência em `src/repositories` e `src/lib/db`.
- Mantenha Prisma, migrações, seed e credenciais neste aplicativo. Preserve o histórico de migrações existente.
- Importe contratos públicos de `@portal-inmobiliario/contracts/public-property`, sem depender de código do frontend.
- Execute comandos compartilhados a partir da raiz; `npm run dev:api` inicia somente este app na porta 3001.
