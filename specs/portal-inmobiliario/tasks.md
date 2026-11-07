# Tarefas — Portal Imobiliário

> Execute as tarefas em ordem. Não comece a próxima até implementar e validar a atual.

> Contexto do produto: Brasil (`BR`), idioma `pt-BR`, moeda BRL (R$), endereço com logradouro, número, complemento opcional, bairro, cidade, UF e CEP. As etapas pendentes devem seguir esse contexto.

## Reestruturação solicitada — Monorepo

- [x] Separar frontend Next.js (`apps/web`) e backend Next.js (`apps/api`) com npm workspaces.
- [x] Compartilhar os contratos REST em `packages/contracts`, preservando os endpoints e o comportamento da landing page.
- [x] Transferir Prisma, serviços, repositórios, migrações, seed, testes e ambiente privado para o backend.
- [x] Atualizar comandos, instalação, documentação e instruções de arquitetura.
- [x] Validar os dois builds, tipos, lint, testes existentes e comunicação HTTP entre os aplicativos.

Validação concluída com `npm test` (lint, tipos dos três workspaces e 19 testes unitários), `npm run build` (dois apps), `npm run test:integration` (15 testes no PostgreSQL), `npm run test:smoke` (seis testes HTTP, aprovados em produção e desenvolvimento), `npm run db:validate`, `npm run db:check` e `npm run db:status`. Instalação pela raiz validada com geração automática do Prisma no ciclo de instalação de `apps/api`. Esquema e arquivos de migração conferidos com o histórico anterior; banco preservado com 16 imóveis, 16 características e duas migrações aplicadas.

Esta reestruturação não antecipa as funcionalidades das Etapas 8 a 37. Os registros abaixo descrevem as validações históricas; os caminhos atuais são os definidos no plano técnico.

## Fase 1 — Fundamentos

- [x] **Etapa 1 — Criar projeto Next.js**
  - Criar projeto com React e TypeScript.
  - Configurar a estrutura básica.
  - Criar `.env.example`.
  - Validar o servidor de desenvolvimento e o build.
  - Revisão pt-BR concluída: instruções do projeto, `.env.example` e comentários de configuração traduzidos.

- [x] **Etapa 2 — Layout e navegação**
  - Criar cabeçalho, navegação, rodapé e layout.
  - Adicionar um design responsivo básico.
  - Navegação: Início, Imóveis, Comprar, Alugar, Entrar.
  - Validado com `npm test`, `npm run build` e navegador em 360, 768 e 1280 px: links, menu móvel, teclado, Escape, foco e salto para o conteúdo; sem transbordamento horizontal nem erros no console.
  - Revisão pt-BR validada: interface, acessibilidade, metadados, idioma do HTML e página 404 em português do Brasil.
  - Direcionamento ao Brasil validado nos textos da página inicial, no rodapé e nos metadados.

- [x] **Etapa 3 — Configurar PostgreSQL**
  - Configurar o PostgreSQL.
  - Selecionar e configurar o ORM.
  - Configurar as migrações.
  - Validar a conexão.
  - Banco `portal_inmobiliario` criado no contêiner PostgreSQL existente; credenciais em `apps/web/.env.local`, ignorado pelo Git.
  - Prisma ORM 7, alinhado ao curso, com adaptador `@prisma/adapter-pg`, driver `pg`, cliente reutilizado no servidor, proteção `server-only` e migrações SQL pelo Prisma Migrate.
  - pgAdmin 4 instalado e em execução no Docker em `http://localhost:5050`, com volume persistente, servidor pré-cadastrado e `restart: always` confirmado.
  - Prisma Client, adaptador e CLI na versão 7.10.1. Validação concluída com `npm test`, `npm run build`, `npm run db:generate`, `npm run db:validate`, `npm run db:check`, `npm run db:migrate` e `npm run db:status`.
  - Geração do cliente e validação do esquema também verificadas sem credenciais. Migração reaplicada sem duplicação: um registro concluído em `_prisma_migrations` e nenhuma tabela de domínio antecipada.
  - Histórico anterior substituído pelo Prisma Migrate após salvar uma cópia em `apps/web/.migrations-anteriores.sql.local`, ignorada pelo Git.
  - pgAdmin validado por HTTP 200, login autenticado e conexão ao PostgreSQL a partir do contêiner. Cache do Turbopack regenerado para concluir o build.

- [x] **Etapa 4 — Criar modelo de domínio**
  - User.
  - Property.
  - PropertyImage.
  - Feature.
  - Favorite.
  - Inquiry.
  - Preços em BRL com precisão decimal e endereço brasileiro conforme os campos de `plan.md`.
  - Criar relacionamentos e restrições.
  - Executar as migrações.
  - Seis modelos Prisma implementados com UUIDs, perfis e tipos enumerados, datas com fuso, preços `Decimal(14, 2)` em BRL e endereço brasileiro com país `BR` por padrão.
  - Relacionamentos, e-mail e favoritos únicos, características compartilhadas, `publicId` único e no máximo uma imagem principal por imóvel. Consultas aceitam visitantes e preservam o contato ao excluir o usuário.
  - Migração transacional `20261101040000_criar_modelo_dominio` aplicada ao PostgreSQL, com índices, chaves estrangeiras e restrições para UF, CEP, país, valores numéricos e formato internacional do telefone.
  - Validação concluída com `npm test`, `npm run build`, `npm run db:validate`, `npm run db:generate`, `npm run db:check`, `npm run db:migrate`, `npm run db:status` e `npm run db:test` (11 testes de integração aprovados).
  - Reaplicação sem migrações pendentes e comparação Prisma/PostgreSQL sem divergências. Todos os cenários de teste revertidos, com as sete tabelas do domínio vazias ao final. Cache do Turbopack regenerado para concluir o build.

- [x] **Etapa 5 — Criar seed**
  - Imóveis realistas para venda e aluguel no Brasil, com preços em BRL e aluguel mensal.
  - Casas, apartamentos, terrenos e escritórios.
  - Diferentes bairros, cidades, UFs, CEPs, preços e características.
  - Seed integrado ao Prisma 7, executado explicitamente por `npm run db:seed`, com carregamento de `apps/web/.env.local` e recusa de execução em produção.
  - 16 imóveis fictícios em sete cidades/UFs nas cinco regiões: oito vendas e oito aluguéis mensais, quatro exemplos por tipo, 14 publicados, dois rascunhos e seis destaques. Endereços brasileiros, CEP com zero inicial, preços e áreas decimais, campos não aplicáveis nulos e 16 características reutilizáveis.
  - Persistência em uma única transação, com IDs fixos e reexecução sem duplicações, preservando datas, edições e registros independentes. Duas execuções do comando confirmadas no PostgreSQL.
  - Validação concluída com `npm run seed:test` (três testes), `npm run db:test` (13 testes de integração), `npm test`, `npm run db:status`, `npm run db:check` e `npm run build`. Cache do Turbopack regenerado para concluir o build.
  - Contagem final confirmada no banco: 16 imóveis, 16 características e nenhum registro de teste persistido. Documentação e comandos atualizados; imagens seguem a etapa de integração com Cloudinary.

## Fase 2 — Portal público

- [x] **Etapa 6 — API REST pública de imóveis**
  - `GET /api/properties`.
  - `GET /api/properties/{id}`.
  - Exibir publicamente apenas imóveis publicados.
  - Separar API, serviços e persistência.
  - Route Handlers dinâmicos no Node.js, serviço de serialização e repositório Prisma com seleção explícita de dados públicos e `isPublished: true` nas duas consultas. Serviços e persistência protegidos com `server-only`.
  - Contrato público compartilhado com preço e áreas em strings decimais de duas casas, datas ISO em UTC, endereço brasileiro e campos opcionais nulos. Imagens por posição e características por nome; consultas, favoritos e `publicId` do Cloudinary não são expostos.
  - UUID inválido retorna `400` antes da consulta; imóvel inexistente ou despublicado retorna o mesmo `404`; falhas internas retornam `500` com mensagem genérica em português. Respostas com `Cache-Control: no-store`.
  - Validação concluída com `npm test`, `npm run api:test` (oito testes unitários), `npm run api:test:integration` (dois testes no PostgreSQL com transações revertidas) e `npm run build`. Cache do Turbopack regenerado para concluir o build.
  - Servidor de produção validado por HTTP: listagem e detalhes dos 14 publicados, dois rascunhos ocultos, ID inexistente, ID inválido, tentativa de incluir rascunhos por query string e método não permitido. Códigos `200`, `400`, `404` e `405`, contrato JSON e cache confirmados.
  - Contagem final preservada no PostgreSQL: 16 imóveis, 16 características, nenhuma imagem ou consulta de teste persistida. README e plano técnico atualizados.

- [x] **Etapa 7 — Landing page**
  - Seção principal de destaque (hero).
  - Campo de busca.
  - Imóveis em destaque.
  - Seções de compra e aluguel.
  - Chamadas para ação.
  - Hero responsivo com ilustração SVG decorativa, busca principal e chamadas para compra, aluguel e catálogo. Cabeçalho, menu móvel, rodapé e salto para o conteúdo preservados. Ícone SVG da marca adicionado à aba do navegador.
  - Uma consulta REST por SWR alimenta destaques, venda e aluguel, com até três imóveis por seleção e ordem preservada da API. Valores em BRL e `/mês` no aluguel, com bairro, cidade, UF e tipo do imóvel.
  - Busca validada com React Hook Form e Zod: texto opcional de até 200 caracteres, operação opcional, remoção de espaços externos e codificação de parâmetros na URL de `/properties`. Formulário GET também validado sem JavaScript. Catálogo e filtragem efetiva seguem as Etapas 9 a 11.
  - Cliente REST com validação Zod e timeout de dez segundos. Carregamento, seleções vazias e erro com nova tentativa, mantendo a busca e as chamadas para ação disponíveis.
  - Validação concluída com `npm run home:test` (oito testes unitários), `npm test` e `npm run build`. Documentação, plano técnico, dependências e comandos atualizados.
  - Edge validado em 320, 360, 768, 1280 e 1440 px, sem transbordamento horizontal: dados reais nas três seleções, uma requisição inicial à API, preços em BRL, busca com acentos e operação, busca vazia, menu móvel, Escape e salto por teclado. Estados de carregamento, lista vazia, erro 500 e recuperação por nova tentativa confirmados; console sem erros e ícone retornando `200`.
  - Servidor de produção atualizado e mantido em `http://localhost:3000`. Esta etapa utiliza listas resumidas; `PropertyCard` e grade de imóveis continuam na Etapa 8.

- [x] **Etapa 8 — PropertyCard e grade responsiva**
  - Criar componente reutilizável.
  - Imagem, título, preço em BRL, operação, bairro/cidade/UF, quartos, banheiros e área.
  - Formatação monetária `pt-BR` e indicação `/mês` para aluguel.
  - Criar grade responsiva.
  - Componentes reutilizáveis `PropertyCard`, `PropertyGrid` e `PropertyImage` em `apps/web/src/components/properties/`, integrados às seleções de destaques, venda e aluguel da landing. Uma coluna no celular, duas a partir de 640 px e três a partir de 1024 px.
  - Cards com operação, tipo, título, bairro/cidade/UF, preços em BRL e `/mês` no aluguel. Quartos e banheiros preservam zero e concordância no singular; campos nulos são omitidos. Área útil em m² com formatação brasileira e área total identificada quando a útil não estiver disponível.
  - Imagem principal com prioridade e alternativa pela menor posição, sem alterar a coleção recebida. `next/image` com URLs HTTPS do Cloudinary, proporção reservada, texto alternativo e carregamento sob demanda. Ausência de foto, URL incompatível ou falha de carregamento apresenta “Imagem indisponível”.
  - Tipo da landing e validação Zod ampliados para os campos dos cards, preservando uma consulta REST compartilhada e os estados existentes. Backend, banco, seed e contrato REST preservados; catálogo e detalhes seguem suas respectivas etapas.
  - Validação concluída com `npm test`: lint, tipos dos três workspaces e 27 testes unitários, incluindo nove da landing e sete de cards/grade. Builds de produção dos dois apps aprovados; cache do Turbopack do frontend regenerado antes de `npm run build:web`.
  - Edge em produção validado em 320, 360, 640, 768, 1024 e 1440 px, com respostas HTTP de teste isoladas do banco: nove cards nas três seleções, uma requisição inicial, uma/duas/três colunas e nenhum transbordamento horizontal. Imagem principal, texto alternativo, carregamento sob demanda, falha de imagem, lista vazia, erro e recuperação, carregamento e foco do salto para o conteúdo confirmados; console sem erros. Capturas de celular, tablet e computador conferidas.
  - Docker Desktop existente iniciado, com PostgreSQL e pgAdmin em execução. Seis testes HTTP do monorepo aprovados contra os dois apps de produção. Cards conferidos novamente em 360 e 1440 px com os imóveis existentes do PostgreSQL: nove cards, uma consulta REST, sem transbordamento ou erros no console. Aplicativos mantidos em `http://localhost:3000` e `http://localhost:3001`.

- [x] **Etapa 9 — Catálogo**
  - Criar `/properties`.
  - Consumir a API REST.
  - Exibir imóveis publicados.
  - Página provisória substituída pelo catálogo com introdução, quantidade de imóveis e a grade reutilizável, exibindo todos os resultados na ordem da API. Preços em BRL, aluguel mensal, localização brasileira, imagens e campos opcionais mantêm o comportamento da Etapa 8.
  - Cliente REST com validação Zod e timeout de dez segundos extraído para `apps/web/src/lib/api/properties.ts`. Hook `usePublicProperties` compartilhado entre landing e catálogo, com a mesma chave SWR e uma consulta inicial por abertura direta. A seleção de publicados permanece exclusivamente no backend existente.
  - Estados básicos de carregamento, catálogo vazio e erro com nova tentativa, com anúncios acessíveis e hierarquia de títulos. Busca, filtros, ordenação e detalhes permanecem nas próximas etapas.
  - Validação concluída com `npm test` (lint, tipos dos três workspaces e 33 testes unitários, incluindo seis do catálogo), builds de produção dos dois apps, `npm run test:smoke` (sete testes HTTP) e `npm run api:test:integration` (dois testes transacionais no PostgreSQL). Build executado fora do isolamento após bloqueios de links/processos do Turbopack; cache gerado do frontend regenerado.
  - Chrome em produção conferido em 320, 360, 640, 768, 1024 e 1440 px: 14 imóveis publicados na ordem da API, uma requisição inicial, uma/duas/três colunas e nenhum transbordamento horizontal. Carregamento, lista vazia, erro e recuperação por nova tentativa validados com respostas HTTP isoladas do banco. Navegação da landing para o catálogo, menu móvel, Escape e salto para o conteúdo confirmados; console inicial sem erros. Capturas de celular, tablet e computador conferidas.
  - Docker Desktop recuperado por reinício normal após falha de inicialização, com PostgreSQL e pgAdmin em execução. API de publicação validada com transações revertidas. README e plano técnico atualizados; aplicativos mantidos em `http://localhost:3000` e `http://localhost:3001`.

- [x] **Etapa 10 — Busca**
  - Busca textual.
  - Título, bairro, cidade, UF e descrição.
  - Representar a busca nos parâmetros de consulta da URL.
  - `GET /api/properties?search=...` valida um único termo de até 200 caracteres, remove espaços externos e pesquisa os cinco campos no PostgreSQL por correspondência parcial sem distinguir maiúsculas e minúsculas. Acentos e caracteres literais preservados, inclusive `%`, `_` e barra invertida; publicados e ordem estável mantidos. Texto vazio equivale ao catálogo completo; entrada longa ou repetida retorna `400` antes da consulta.
  - Formulário do catálogo com React Hook Form, Zod e ação GET, preenchido pela URL. Busca e limpeza preservam os demais parâmetros existentes. Integração da busca da landing, acesso direto, recarga e voltar/avançar conferidos. Filtros de operação e demais campos continuam na Etapa 11.
  - Uma chave SWR por termo normalizado, sem filtragem do catálogo no navegador nem uso de resultados de outro termo. Busca vazia compartilha o cache da landing. Termo, contagem, carregamento, ausência de correspondências, falha com nova tentativa e recuperação de URL inválida tratados com textos acessíveis.
  - Validação concluída com `npm test` (lint, tipos dos três workspaces e 41 testes unitários), quatro testes de integração da API no PostgreSQL com transações revertidas, nove testes HTTP de `npm run test:smoke` e builds de produção dos dois aplicativos. Bloqueios de links, processos e conexão local do sandbox resolvidos com execução fora do isolamento; cache gerado do frontend regenerado para concluir o build.
  - Navegador em produção validado em 320, 360, 640, 768, 1024 e 1440 px, sem transbordamento horizontal. Busca da landing, pesquisa pelo catálogo e Enter, termo com acento, limpar, lista sem resultados, limite de 200 caracteres, parâmetros repetidos, preservação de operação, histórico e recarga conferidos; console sem erros ou avisos. README e plano técnico atualizados; aplicativos em `http://localhost:3000` e `http://localhost:3001`.

- [ ] **Etapa 11 — Filtros**
  - Venda/aluguel.
  - Tipo.
  - Faixa de preço em BRL.
  - Quartos.
  - Banheiros.
  - Área mínima.
  - Bairro/cidade/UF, usando `neighborhood`, `city` e `state` na URL e na API.
  - Permitir filtros combinados.

- [ ] **Etapa 12 — Ordenação e estados**
  - Mais recentes.
  - Preço em ordem crescente/decrescente.
  - Área em ordem crescente/decrescente.
  - Estados de carregamento, ausência de resultados e erro.
  - Skeletons quando agregarem valor.

- [ ] **Etapa 13 — Detalhes do imóvel**
  - Criar `/properties/{id}`.
  - Exibir informações completas.
  - Consumir exclusivamente a API REST.

- [ ] **Etapa 14 — Galeria**
  - Imagem principal.
  - Miniaturas.
  - Navegação.
  - Responsividade.

- [ ] **Etapa 15 — Google Maps**
  - Construir a localização a partir de logradouro, número, bairro, cidade, UF, CEP e Brasil.
  - Integrar o Google Maps.
  - Não solicitar latitude/longitude manualmente.

- [ ] **Etapa 16 — Contato com Web3Forms**
  - Formulário de contato.
  - Incluir ID/título do imóvel.
  - Estados de envio em andamento/sucesso/erro.
  - Validar os dados.
  - Aceitar telefone brasileiro com DDD e prefixo `+55`; normalizar para formato internacional.

## Fase 3 — Autenticação e usuário

- [ ] **Etapa 17 — Cadastro e login via REST**
  - Cadastro.
  - Login.
  - Logout.
  - Endpoint do usuário atual.
  - Hashing seguro.

- [ ] **Etapa 18 — Autorização USER e ADMIN**
  - Criar perfis de acesso.
  - Proteger APIs.
  - Proteger páginas.
  - Aplicar permissões no backend.

- [ ] **Etapa 19 — Conta do usuário**
  - Criar `/account`.
  - Exibir informações básicas.
  - Preparar seções de imóveis de interesse e imóveis sobre os quais foram enviadas consultas.

- [ ] **Etapa 20 — Favoritos**
  - Listar.
  - Adicionar.
  - Remover.
  - Evitar duplicações.
  - Integrar à interface.

- [ ] **Etapa 21 — Persistir consultas**
  - Criar consulta por REST.
  - Persistir no PostgreSQL.
  - Associar o imóvel.
  - Associar o usuário, quando houver.
  - Integrar o envio pelo Web3Forms.

## Fase 4 — Administração

- [ ] **Etapa 22 — Painel ADMIN**
  - Criar `/admin`.
  - Exibir indicadores.
  - Restringir o acesso a ADMIN.

- [ ] **Etapa 23 — CRUD REST de imóveis**
  - Listar.
  - Criar.
  - Obter.
  - Atualizar.
  - Excluir.
  - Proteger endpoints.

- [ ] **Etapa 24 — Interface de administração**
  - `/admin/properties`.
  - `/admin/properties/new`.
  - `/admin/properties/{id}/edit`.

- [ ] **Etapa 25 — Formulário de imóvel**
  - Título e descrição.
  - Operação e tipo.
  - Preço em BRL, com valor mensal para aluguel.
  - Área útil/total.
  - Quartos, banheiros e vagas de garagem.
  - Idade do imóvel.
  - Logradouro, número, complemento opcional, bairro, cidade, UF e CEP; país Brasil (`BR`) automático.
  - Validar UF e CEP no backend e preservar zeros à esquerda do CEP.
  - Características.
  - Publicado/em destaque.
  - Não adicionar campos para inserção manual de latitude/longitude.

- [ ] **Etapa 26 — Upload para o Cloudinary**
  - Configurar o Cloudinary.
  - Criar upload seguro por REST.
  - Validar tipo e tamanho.
  - Salvar URL e `publicId`.

- [ ] **Etapa 27 — Administração de imagens**
  - Múltiplas imagens.
  - Excluir.
  - Selecionar a principal.
  - Ordenar.
  - Manter o Cloudinary e o PostgreSQL sincronizados.

- [ ] **Etapa 28 — Características**
  - Múltiplas características por imóvel.
  - Modelo flexível.
  - Permitir novas características sem modificar as colunas de Property.

- [ ] **Etapa 29 — Usuários**
  - Criar `/admin/users`.
  - Listar e buscar.
  - Ativar/desativar.
  - Modificar o perfil de acesso quando apropriado.

- [ ] **Etapa 30 — Consultas**
  - Criar `/admin/inquiries`.
  - Exibir imóvel, usuário, contato, mensagem e data.
  - Incluir link para o imóvel associado.

## Fase 5 — Qualidade e finalização

- [ ] **Etapa 31 — SEO e metadados**
  - Metadados dinâmicos.
  - Título.
  - Descrição.
  - Open Graph.

- [ ] **Etapa 32 — Otimização**
  - Otimizar imagens com Next.js/Cloudinary.
  - Evitar imagens com dimensões excessivas.
  - Revisar requisições duplicadas.
  - Revisar consultas ao PostgreSQL.

- [ ] **Etapa 33 — Responsividade e acessibilidade**
  - Computadores.
  - Tablets.
  - Celulares.
  - Rótulos, teclado, foco, textos alternativos e semântica.

- [ ] **Etapa 34 — Segurança**
  - Autenticação.
  - Autorização.
  - Validação REST.
  - Uploads.
  - Segredos.
  - Cloudinary.
  - Web3Forms.
  - Endpoints ADMIN.

- [ ] **Etapa 35 — QA integral**
  - Fluxos de visitante.
  - Fluxos de USER.
  - Fluxos de ADMIN.
  - Erros e códigos HTTP.
  - BRL, aluguel mensal, endereços brasileiros, UF, CEP, telefone com DDD e `+55` e localização no Brasil.
  - Corrigir defeitos que impeçam o funcionamento.

- [ ] **Etapa 36 — Conformidade arquitetural**
  - Confirmar que não existem Server Actions.
  - Confirmar a comunicação REST.
  - Confirmar o uso do PostgreSQL.
  - Confirmar que o React não acessa o banco de dados.
  - Confirmar as permissões no backend.
  - Confirmar as integrações externas.

- [ ] **Etapa 37 — Convergência final do SDD**
  - Reler `spec.md`.
  - Reler `plan.md`.
  - Comparar a implementação com os requisitos.
  - Corrigir itens ausentes ou inconsistências.
  - Executar o build e as validações finais.
  - Confirmar a ausência de erros que impeçam o funcionamento.
