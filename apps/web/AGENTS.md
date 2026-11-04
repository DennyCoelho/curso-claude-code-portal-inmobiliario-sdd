<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Frontend do monorepo

Este aplicativo contém a interface Next.js do portal. Consulte `../../CLAUDE.md` e `../../specs/portal-inmobiliario/` antes de alterar funcionalidades.

- Consuma o backend exclusivamente por HTTP REST. `/api/**` é encaminhado por `next.config.ts` à origem definida em `API_URL`.
- Importe tipos públicos de `@portal-inmobiliario/contracts/public-property`. Mantenha Prisma, serviços de negócio, repositórios e credenciais de banco em `../api`.
- Execute comandos compartilhados a partir da raiz; `npm run dev:web` inicia somente este app na porta 3000.
