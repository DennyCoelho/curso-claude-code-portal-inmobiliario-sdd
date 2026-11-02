# Tarefas — Portal Imobiliário

> Execute as tarefas em ordem. Não comece a próxima até implementar e validar a atual.

> Contexto do produto: Brasil (`BR`), idioma `pt-BR`, moeda BRL (R$), endereço com logradouro, número, complemento opcional, bairro, cidade, UF e CEP. As etapas pendentes devem seguir esse contexto.

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

- [ ] **Etapa 6 — API REST pública de imóveis**
  - `GET /api/properties`.
  - `GET /api/properties/{id}`.
  - Exibir publicamente apenas imóveis publicados.
  - Separar API, serviços e persistência.

- [ ] **Etapa 7 — Landing page**
  - Seção principal de destaque (hero).
  - Campo de busca.
  - Imóveis em destaque.
  - Seções de compra e aluguel.
  - Chamadas para ação.

- [ ] **Etapa 8 — PropertyCard e grade responsiva**
  - Criar componente reutilizável.
  - Imagem, título, preço em BRL, operação, bairro/cidade/UF, quartos, banheiros e área.
  - Formatação monetária `pt-BR` e indicação `/mês` para aluguel.
  - Criar grade responsiva.

- [ ] **Etapa 9 — Catálogo**
  - Criar `/properties`.
  - Consumir a API REST.
  - Exibir imóveis publicados.

- [ ] **Etapa 10 — Busca**
  - Busca textual.
  - Título, bairro, cidade, UF e descrição.
  - Representar a busca nos parâmetros de consulta da URL.

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
