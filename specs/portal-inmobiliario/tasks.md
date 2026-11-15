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

- [x] **Etapa 11 — Filtros**
  - Venda/aluguel.
  - Tipo.
  - Faixa de preço em BRL.
  - Quartos.
  - Banheiros.
  - Área mínima.
  - Bairro/cidade/UF, usando `neighborhood`, `city` e `state` na URL e na API.
  - Permitir filtros combinados.
  - API REST com validação de operação, tipo, UF brasileira, limites decimais e inteiros, faixa de preço e parâmetros repetidos antes da consulta. Valores vazios são ignorados; decimais são preservados como strings. Filtros combinados por AND com a busca no PostgreSQL, sempre limitados aos publicados e mantendo a ordem estável.
  - Preços mínimo e máximo inclusivos em BRL; quartos e banheiros são quantidades mínimas, incluindo zero, identificadas na interface. Área mínima considera somente a útil; campos nulos não atendem aos mínimos. Bairro e cidade usam correspondência parcial sem distinção de maiúsculas, com acentos e caracteres literais preservados; UF é normalizada para maiúsculas.
  - Formulário GET responsivo com React Hook Form, Zod, rótulos e erros acessíveis. Aceita vírgula ou ponto decimal sem milhar e gera valores com ponto na URL e na API. Aplicar e limpar filtros preserva a busca; a busca preserva os filtros. Campos preenchidos pela URL, com acesso direto, recarga e histórico; chave SWR canônica por combinação normalizada e orientação específica para ausência de resultados.
  - Validação concluída com `npm test` (lint, tipos dos três workspaces e 48 testes unitários), cinco testes de integração da API no PostgreSQL com transações revertidas, dez testes HTTP de `npm run test:smoke` e builds de produção dos dois aplicativos. Bloqueios do sandbox resolvidos com execução fora do isolamento; cache gerado do frontend regenerado. Docker Desktop iniciado com PostgreSQL e pgAdmin existentes; timeouts durante a inicialização do banco resolvidos antes da execução final aprovada.
  - Navegador em produção conferido em 320, 360, 640, 768, 1024 e 1440 px: formulário com uma/duas/três colunas, sem transbordamento horizontal. Todos os dez filtros junto à busca retornaram o imóvel esperado; vírgula decimal, faixa invertida com erro associado ao campo, limpeza preservando a busca, voltar/avançar, recarga, ausência de resultados e recuperação confirmados; console sem erros ou avisos. README e plano técnico atualizados. Aplicativos em `http://localhost:3000` e `http://localhost:3001`; ordenação permanece na Etapa 12.

- [x] **Ajuste solicitado — Painel lateral de filtros da Etapa 11**
  - Painel à esquerda dos cards, recolhível e expansível, com adaptação ao celular.
  - Checkboxes de tipos com seleção múltipla na interface, URL e PostgreSQL.
  - Barra de preço com duas alças, valores em BRL e faixa real dos imóveis publicados.
  - Quartos: qualquer quantidade, 1, 2, 3 ou 4 ou mais.
  - Validar contratos, testes, builds, teclado e responsividade.
  - Painel à esquerda dos cards a partir de 1024 px, com duas colunas de cards enquanto expandido e três ao recolher. Em telas menores, seção recolhível acima dos resultados. O botão anuncia expansão e controla o painel; recolher preserva os campos e filtros ativos.
  - Tipos com checkboxes e parâmetros `type` repetidos, validados, deduplicados e ordenados no cache; consulta por OR entre os tipos e AND com os demais filtros. Quartos agora usa igualdade para 1/2/3 ou mínimo de quatro em `bedrooms=4%2B`, substituindo a regra inicial de quantidade mínima registrada acima.
  - Barra com duas alças, preços em BRL e precisão de centavos, suporte a arraste e teclado e bloqueio de cruzamento. Novo `GET /api/properties/price-range` agrega somente os preços de publicados, opcionalmente por operação, sem transferir o catálogo. Troca de operação limpa os limites do formulário; preços válidos na URL ampliam a faixa quando necessário. Carregamento, ausência de preços e erro com nova tentativa tratados.
  - Validação aprovada com `npm test` (lint, tipos e 52 testes unitários), seis testes de integração da API em transações revertidas, onze testes HTTP e `npm run build` dos dois aplicativos. Navegador em 320, 360, 768, 1024 e 1440 px, sem transbordamento horizontal; alinhamento lateral, recolher/expandir sem perder seleção, tipos múltiplos, quartos exatos e 4+, arraste das duas alças, teclado, centavos, impedimento de cruzamento, recarga e histórico conferidos; console sem erros ou avisos. Especificação, plano e README atualizados; aplicativos locais reiniciados com os builds novos.

- [x] **Ajuste solicitado — Escala de preço, banheiros e localização**
  - Barra fixa de R$ 0 a R$ 10 milhões, com incrementos de R$ 50, R$ 100, R$ 500 e R$ 1.000 conforme a faixa.
  - Banheiros com qualquer quantidade, 1, 2, 3 ou 4 ou mais, na interface, URL e API.
  - Sequência: área útil, Estado (UF), Cidade e Bairro.
  - Validar escala, filtros, teclado, builds e responsividade.
  - Barra disponível imediatamente de R$ 0 a R$ 10.000.000, com 11.900 passos: R$ 50 até R$ 10 mil, R$ 100 até R$ 100 mil, R$ 500 até R$ 1 milhão e R$ 1.000 acima. As duas alças seguem a escala por arraste e teclado, sem cruzar. Campos ocultos enviam preços em reais, sem expor os índices internos na URL. Trocar operação preserva a seleção; preços válidos de URLs anteriores dentro da faixa mantêm os centavos até movimentar a alça.
  - Banheiros agora usa opções de escolha única: qualquer quantidade, 1, 2, 3 ou 4 ou mais, com igualdade em 1/2/3 e `gte: 4` em `4+`. Contrato compartilhado, validação no frontend/backend e consulta no PostgreSQL atualizados; zero e números fora das opções são rejeitados. Campos na ordem área útil, Estado (UF), Cidade e Bairro, incluindo navegação por teclado.
  - Validação concluída com `npm test` (lint, tipos e 53 testes unitários), seis testes de integração da API em transações revertidas, onze testes HTTP e builds dos dois aplicativos. Todos os passos e as transições foram testados, incluindo avanço e retorno nos limites e URLs anteriores. Navegador em produção conferido em 320, 360, 768, 1024 e 1440 px sem transbordamento; arraste das duas alças, teclado, extremos, bloqueio de cruzamento, envio de preços reais, troca de operação, banheiros exatos/4+, recarga, histórico e sequência dos campos confirmados. Console sem erros ou avisos; documentação atualizada e aplicativos reiniciados com os builds novos.

- [x] **Ajuste solicitado — Preços digitáveis e sincronizados**
  - Mínimo e máximo editáveis, sincronizados com as duas alças.
  - Aceitar valores em reais e preservar centavos digitados, validando limites e faixa.
  - Remover a legenda de incrementos, mantendo os passos da barra.
  - Validar digitação, arraste, teclado, URLs, builds e responsividade.
  - Valores mínimo e máximo substituídos por campos editáveis com rótulos em reais e teclado decimal, usando os mesmos valores do formulário que alimentam as alças. Digitar preserva centavos e atualiza a posição; arrastar ou usar as setas preenche os campos em `pt-BR`, mantendo os incrementos da barra. Legenda de incrementos removida.
  - Aceita números simples, ponto ou vírgula decimal e milhar brasileiro, inclusive colagem com `R$`. Formatação aplicada ao sair do campo, sem alterar o texto durante a digitação. Valida preço não negativo, teto de R$ 10 milhões, duas casas decimais e mínimo menor ou igual ao máximo. Foco de erro direcionado ao campo editável correspondente. URL e API recebem valores reais normalizados, sem duplicar parâmetros no formulário GET.
  - `npm test` aprovado com lint, tipos e 54 testes unitários; build do frontend e onze testes HTTP aprovados. Navegador conferido em 320, 360, 768, 1024 e 1440 px sem transbordamento: entrada com `R$`, milhar e centavos, atualização das duas alças, formatação, arraste, teclado, faixa invertida, teto excedido, foco de erro, recarga e envio normalizado confirmados. Console sem erros ou avisos. Especificação, plano e README atualizados; aplicativo local reiniciado com o novo build.

- [x] **Ajuste solicitado — Novos incrementos da barra de preço**
  - R$ 100 até R$ 5 mil; R$ 500 até R$ 10 mil; R$ 1.000 até R$ 50 mil; R$ 5.000 até R$ 100 mil; R$ 10.000 até R$ 1 milhão; R$ 50.000 acima de R$ 1 milhão, até o teto existente de R$ 10 milhões.
  - Preservar valores livres e centavos nos campos editáveis, sincronizando as alças com a faixa correspondente sem arredondar o valor digitado.
  - Validar todos os passos, transições nos dois sentidos, digitação fora dos passos, URLs, lint, tipos e build do frontend.
  - Escala atualizada para 380 passos nas seis faixas solicitadas. Campos editáveis preservam qualquer preço válido e seus centavos; alças acompanham a posição permitida mais próxima e seus movimentos aplicam os novos incrementos.
  - `npm test` aprovado com lint, tipos dos três workspaces e 55 testes unitários. Todos os passos e as cinco transições foram conferidos nos dois sentidos, incluindo centavos junto aos limites; valores livres nas seis faixas mantêm precisão e URLs normalizadas. `npm run build:web` aprovado após regenerar o cache `.next` e executar fora do isolamento.

- [x] **Etapa 12 — Ordenação e estados**
  - Mais recentes.
  - Preço em ordem crescente/decrescente.
  - Área em ordem crescente/decrescente.
  - Estados de carregamento, ausência de resultados e erro.
  - Skeletons quando agregarem valor.
  - Seletor acessível de ordenação com formulário GET e botão Ordenar: `recent`, `price_asc`, `price_desc`, `area_asc` e `area_desc`. Busca, filtros e tipos repetidos são preservados; seleção preenchida pela URL, inclusive recarga e histórico. Parâmetros inválidos ou repetidos impedem a consulta e permitem corrigir a seleção.
  - Ordenação aplicada no PostgreSQL junto dos filtros e da busca, usando preços decimais e área útil. Áreas úteis nulas ficam ao final nos dois sentidos; empates usam data de criação decrescente e ID crescente. Ausência ou vazio mantém mais recentes. A API valida `sort` antes do serviço e responde `400` quando inválido.
  - Chave SWR por combinação de busca, filtros e ordenação, com cache padrão compartilhado para `recent` explícito ou implícito. Carregamento com seis skeletons na grade, ocultos da acessibilidade e animados somente sem preferência por movimento reduzido. Ausência de dados iniciais permanece em carregamento até a resposta; catálogo vazio, ausência de correspondências e erro com nova tentativa preservam os estados específicos.
  - Validação concluída com `npm test` (lint, tipos dos três workspaces e 61 testes unitários), sete testes de integração no PostgreSQL com transações revertidas, 12 testes HTTP/proxy e `npm run build` dos dois aplicativos. Caches `.next` regenerados e builds executados fora do isolamento.
  - Navegador em produção conferido em 320, 360, 768, 1024 e 1440 px, sem transbordamento horizontal. As cinco ordens, filtros combinados, tipos múltiplos, teclado, recarga, voltar/avançar, limpar busca/filtros preservando ordenação, ausência de resultados e correção de opção inválida confirmados. Falha temporária da API e recuperação por Tentar novamente preservaram a ordenação; nenhum erro inesperado no console. Especificação, plano e README atualizados; aplicativos em `http://localhost:3000` e `http://localhost:3001` com os builds novos.

- [x] **Etapa 13 — Detalhes do imóvel**
  - Criar `/properties/{id}`.
  - Exibir informações completas.
  - Consumir exclusivamente a API REST.
  - Rota `/properties/[id]` renderizada no servidor, consultando somente `GET /api/properties/{id}` na origem `API_URL`, com validação Zod do contrato completo, UUID validado antes da requisição, timeout de dez segundos e `cache: no-store`. Ausência usa `notFound()`; falhas HTTP, rede ou contrato usam mensagem genérica, sem dados internos.
  - Detalhes com título, preço BRL, aluguel mensal, operação, tipo, foto principal, descrição, áreas útil e total, quartos, banheiros, vagas, idade, características, endereço com complemento e CEP brasileiro e datas em `pt-BR` no fuso `America/Sao_Paulo`. Campos nulos são omitidos; zeros são preservados. Imagem ausente/indisponível e descrição/características ausentes têm tratamento próprio.
  - Cards da landing e do catálogo abrem os detalhes por links acessíveis, sem pré-busca das páginas. Parâmetro `from` preserva busca, tipos múltiplos, filtros e ordenação no retorno ao catálogo; o caminho de retorno é sempre local. Galeria, mapa, contato e metadados completos permanecem nas respectivas etapas.
  - Carregamento com skeletons, página específica de imóvel indisponível com `noindex` e fronteira de erro com `retry()` e navegação ao catálogo. Em respostas já transmitidas por streaming, o framework pode manter HTTP `200` ao exibir ausência; a API preserva seu `404`.
  - `npm test` aprovado com lint, tipos dos três workspaces e 71 testes unitários, incluindo dez testes novos de detalhes. `npm run build:web` e 14 testes HTTP/proxy aprovados; páginas de venda, aluguel e terreno conferidas com os dados renderizados no HTML. Backend e dados existentes preservados.
  - Navegador em produção validado em 320, 360, 768, 1024 e 1440 px, sem transbordamento horizontal. Acesso pelos cards da landing e do catálogo, teclado, recarga, retorno com filtros/ordenação, campos completos, nulos/zero, carregamento e ausência com `noindex` confirmados. Falha temporária da API exibiu a mensagem genérica; após restaurar o backend, Tentar novamente recuperou os detalhes. Apenas o erro esperado da simulação foi registrado pelo React/servidor. Documentação atualizada e aplicativos em `http://localhost:3000` e `http://localhost:3001` com o frontend novo.

- [x] **Etapa 14 — Galeria**
  - Imagem principal.
  - Miniaturas.
  - Navegação.
  - Responsividade.
  - `PropertyGallery` integrado aos detalhes, recebendo somente título e imagens já carregados por REST. Imagem principal primeiro e demais por posição, sem alterar a coleção; sem principal, começa pela menor posição. Miniaturas em grade responsiva e foto com proporção reservada, `sizes` próprios e `next/image`.
  - Seleção por miniaturas, contador anunciado, botões anterior/próxima com navegação circular e suporte a setas esquerda/direita e Home/End dentro da galeria. Rótulos em pt-BR, texto alternativo por foto, indicação da seleção e preservação de foco; sem rotação automática. Seleção acompanha o ID da foto e reinicia ao mudar de imóvel.
  - Ausência de foto, URL incompatível e falha de carregamento preservam o tratamento de imagem indisponível. Miniaturas têm apresentação compacta; uma falha não bloqueia a navegação. Zero ou uma foto não exibem controles ou miniaturas redundantes. Pré-carregamento da foto inicial e miniaturas sob demanda.
  - `npm test` aprovado com lint, tipos dos três workspaces e 81 testes, incluindo dez novos testes de galeria: seis de ordenação/renderização e quatro de interação em DOM simulado com jsdom. Cobertos seleção, volta circular, teclado, foco, falha de foto/miniatura, remoção de fotos e troca de imóvel, usando o componente real do Next com a configuração de imagens do app.
  - Build de produção do frontend aprovado após regeneração do cache do Turbopack; 14 testes HTTP/proxy aprovados, incluindo a galeria nos detalhes de venda, aluguel e terreno. A automação de navegador foi encerrada por não conseguir confirmar a URL ativa no Windows; a conferência visual em diferentes larguras não foi realizada. Essa limitação não é coberta pelo DOM simulado.
  - Especificação, plano e README atualizados. Backend, banco e seed preservados; os exemplos existentes continuam sem fotografias, com o gerenciamento de imagens reservado à etapa correspondente. Aplicativos em `http://localhost:3000` e `http://localhost:3001`.

- [x] **Etapa 15 — Google Maps**
  - Construir a localização a partir de logradouro, número, bairro, cidade, UF, CEP e Brasil.
  - Integrar o Google Maps.
  - Não solicitar latitude/longitude manualmente.
  - `PropertyMap` integrado à seção Localização, preservando o endereço textual, o complemento e a galeria. Consulta montada com logradouro, número, bairro, cidade, UF, CEP formatado e Brasil; complemento omitido do mapa. Endereço recebido pela API REST existente, sem coordenadas manuais ou acesso ao banco pelo frontend.
  - Incorporação pública do Google Maps por iframe, com consulta codificada, idioma `pt-BR`, parâmetro de país `br`, título acessível, largura responsiva, altura reservada, carregamento sob demanda e política de referência `no-referrer`. Localização identificada como aproximada e link independente para abrir o mesmo endereço em nova aba, com orientação caso o mapa não carregue.
  - Configuração de servidor `GOOGLE_MAPS_ZOOM` em `apps/web`, aceitando inteiros de 0 a 21 e padrão 15 para ausência ou valor inválido. Fluxo sem SDK, nova dependência ou chave da Maps Embed API v1; placeholder privado existente do backend preservado e não exposto. Exemplos de ambiente, especificação, plano e README atualizados.
  - `npm test` aprovado com lint, tipos dos três workspaces e 87 testes, incluindo seis novos testes de endereço, URLs, zoom, renderização e acessibilidade do mapa. Testes dos detalhes confirmam a integração e a consulta REST única. Build de produção do frontend e 14 testes HTTP/proxy aprovados, incluindo mapa nos detalhes de venda, aluguel e terreno.
  - Navegador em produção validado em 320, 360, 768, 1024 e 1440 px, sem transbordamento horizontal e com iframe de pelo menos 200 px de largura. Mapa real carregado com o endereço de Brasília, controles e textos em português, link externo com foco visível e recarga confirmados; capturas de celular e computador conferidas e console sem erros ou avisos. Zoom temporário de viewport removido ao concluir.
  - Backend funcional, contratos, banco e cadastros preservados. Aplicativos reiniciados com o frontend novo em `http://localhost:3000` e `http://localhost:3001`.

- [x] **Etapa 16 — Contato com Web3Forms**
  - Formulário de contato.
  - Incluir ID/título do imóvel.
  - Estados de envio em andamento/sucesso/erro.
  - Validar os dados.
  - Aceitar telefone brasileiro com DDD e prefixo `+55`; normalizar para formato internacional.
  - `PropertyContactForm` integrado aos detalhes com nome, e-mail, telefone obrigatório e mensagem, rótulos, ajuda, erros associados aos campos e foco no primeiro erro. React Hook Form + Zod, campo invisível antispam e estados acessíveis de envio, sucesso e erro; bloqueio durante a requisição, prevenção de envio simultâneo e limpeza somente no sucesso. Falhas preservam os campos, sem repetição automática.
  - Contrato público `property-contact` compartilhado entre os aplicativos: nome de 2–100 caracteres, e-mail de até 254, mensagem de 10–3000 e celular com DDD brasileiro válido e onze dígitos nacionais. Aceita máscara e prefixo `+55`, preserva o DDD 55 e normaliza para formato internacional. Campos arbitrários, chave e título fornecidos pelo visitante são rejeitados.
  - `POST /api/contact` prepara o contato no backend com validação Zod, corpo JSON limitado a 20 KB reais e consulta ao imóvel publicado. Serviço obtém ID/título canônicos, normaliza o telefone e retorna `provider`/`payload`, sem confirmar envio. Configuração ausente/inválida retorna `503`, imóvel indisponível `404`, entrada inválida `400`/`413`/`415` e falha interna `500`, com mensagens genéricas em pt-BR. Nenhum contato ou chave é registrado em logs.
  - Fluxo compatível com a chave gratuita: navegador valida o contrato de preparação e o ID do imóvel e envia JSON diretamente a `https://api.web3forms.com/submit`. Timeout de quinze segundos em cada requisição; somente HTTP de sucesso e `success: true` do provedor confirmam o envio. Preparação inválida, imóvel divergente ou falhas do provedor impedem sucesso; nenhuma repetição automática. Backend não faz chamadas externas ao Web3Forms.
  - Access key pública do Web3Forms configurada em `apps/api/.env.local`, ignorado pelo Git, e entregue ao navegador na preparação conforme a orientação oficial do provedor. Exemplos versionados sem valores reais; nenhuma credencial privada de banco, autenticação ou Cloudinary integra o payload. README, especificação e plano atualizados. Persistência e vínculo com usuário continuam na Etapa 21; banco, cadastros e migrações preservados.
  - `npm test` aprovado com lint, tipos dos três workspaces e 105 testes, incluindo oito testes de contrato, telefone, preparação e Route Handler e dez testes de cliente/interação em jsdom. Cobertos validação/foco, sequência REST → Web3Forms, dados canônicos, falhas de preparação/provedor, confirmação explícita, envio pendente, duplicação, preservação dos campos, nova tentativa e troca de imóvel. Respostas externas simuladas, sem envio de e-mails reais.
  - Builds de produção dos dois aplicativos aprovados fora do isolamento do Windows. Dezesseis testes HTTP/proxy aprovados com PostgreSQL real, incluindo formulário renderizado nos detalhes de venda/aluguel/terreno, erros consistentes e preparação válida pelos dois aplicativos sem disparar e-mail no backend. Servidores reiniciados com os builds atualizados nas portas 3000 e 3001.
  - Envio real pelo fluxo gratuito confirmado manualmente pelo usuário. Ajuste dos campos concluído: placeholders solicitados, asteriscos nos quatro rótulos obrigatórios e máscara automática de celular com limite de onze dígitos, edição/colagem, preservação do cursor e rejeição de números incompletos/fixos/excedentes no contrato REST. Validação em DOM simulado e HTTP; conferência visual automatizada não realizada, pois a ferramenta de navegador retornou timeout `service_info`.

## Fase 3 — Autenticação e usuário

- [x] **Etapa 17 — Cadastro e login via REST**
  - Cadastro.
  - Login.
  - Logout.
  - Endpoint do usuário atual.
  - Hashing seguro.
  - Contrato Zod estrito compartilhado em `packages/contracts/src/auth.ts`: nome de 2–100 caracteres e e-mail normalizado para minúsculas. Política de senha ajustada por solicitação: cadastro exige 8–15 caracteres, maiúscula, número, caractere especial e `confirmPassword` igual; sequências aceitas. Espaços e Unicode preservados; espaços não contam como especiais. Login mantém compatibilidade com senhas existentes de até 128 caracteres. Cadastro atribui somente USER ativo; perfil, status e demais campos arbitrários são rejeitados.
  - `POST /api/auth/register` cria a conta e sessão atomicamente (`201`); `POST /api/auth/login` inicia uma nova sessão (`200`); `POST /api/auth/logout` revoga a sessão apresentada e expira o cookie (`204`); `GET /api/auth/me` retorna somente ID, nome, e-mail e perfil do usuário ativo (`200`/`401`). Serviços e repositórios exclusivos do backend, respostas sem cache e erros genéricos, sem credenciais nos logs ou no JSON.
  - Senhas com `scrypt` assíncrono nativo (`N=131072`, `r=8`, `p=1`), salt aleatório de 16 bytes e comparação em tempo constante. Conta ausente também executa o hashing; e-mail ausente, senha incorreta e conta inativa retornam o mesmo erro de login. Até dois cálculos simultâneos por instância, com `503` em saturação; dez tentativas por operação/e-mail a cada quinze minutos, compartilhadas no PostgreSQL com UPSERT atômico e `429`/`Retry-After` no excesso.
  - Sessões opacas de sete dias com tokens aleatórios de 32 bytes, somente hash SHA-256 persistido e cookie HttpOnly/SameSite=Lax/Path=/ sem Domain. Produção usa Secure e prefixo `__Host-`; desenvolvimento usa cookie local. Login/cadastro trocam o token e revogam a sessão anterior apresentada; `/me` confere expiração, perfil e atividade atuais. Logout é idempotente. Migração aditiva `20261115010000_criar_sessoes_autenticacao` aplicada com tabelas `Session` e `AuthRateLimit`, preservando o domínio existente.
  - Proteção dos POSTs por origens exatas em `AUTH_TRUSTED_ORIGINS`, recusa de `Sec-Fetch-Site: cross-site`, JSON limitado a 8 KB reais e rejeição de formatos incompatíveis. Clientes REST sem Origin permanecem aceitos. Configuração local funciona sem segredo de assinatura; origens HTTPS de produção e limpeza periódica de sessões/contadores vencidos documentadas.
  - `/login` substituído e `/register` criado com React Hook Form/Zod, rótulos e erros acessíveis, foco no primeiro erro, senha com autocomplete apropriado, envio pendente, bloqueio de duplicação e preservação dos campos em falhas. Confirmação limpa a senha, apresenta a sessão, permite sair ou continuar ao catálogo. Cabeçalho mostra Minha sessão quando conectado. SWR compartilha uma consulta `/me` entre painel e navegação, sem credenciais em localStorage/sessionStorage. Permissões e conta privada seguem as Etapas 18 e 19.
  - `npm test` aprovado com lint, tipos dos três workspaces e 124 testes unitários, incluindo 12 novos testes da API de autenticação e sete da interface. `npm run test:integration` aprovado com 23 testes no PostgreSQL, incluindo três de autenticação; cenários transacionais revertidos e chave exclusiva do teste concorrente removida. Uma falha transitória sem diagnóstico no arquivo antigo da API pública não se repetiu na execução isolada nem na repetição completa aprovada.
  - Builds de produção dos dois aplicativos aprovados; 17 testes HTTP/proxy de `npm run test:smoke` e dois fluxos completos de `npm run auth:test:http` aprovados diretamente e pelo frontend. Navegador confirmou cadastro, foco dos erros, cookie de produção preservado na recarga, logout, nova entrada, navegação e menu móvel/Escape. Larguras de 320, 768 e 1440 px sem transbordamento horizontal; capturas de celular/computador conferidas e console sem erros ou avisos.
  - Conta descartável do navegador e contas HTTP removidas com suas sessões/contadores. Contagem final: 16 imóveis, 16 características, nenhuma sessão, contador ou conta de teste de autenticação persistida. README, especificação, plano e exemplos de ambiente atualizados; aplicativos de produção disponíveis em `http://localhost:3000` e `http://localhost:3001`.
  - Ajuste solicitado: removida a mensagem “Campos com * são obrigatórios.” de cadastro, entrada e contato. Validação de campos vazios ao enviar e foco no primeiro erro preservados; 43 testes existentes de autenticação/detalhes aprovados e build do frontend concluído.
  - Contas fictícias solicitadas: comando separado `npm run db:seed:users` criou USER ativo (`usuario@exemplo.test`), ADMIN ativo (`admin@exemplo.test`) e USER inativo (`inativo@exemplo.test`), com credenciais públicas de demonstração no README e hashes scrypt no PostgreSQL. Seed transacional, recusado em produção, sem sessões e sem alterar contas existentes ou contas com e-mail conflitante. Reexecução confirmada: zero criações e três contas preservadas.
  - Lint e TypeScript do backend aprovados, 39 testes unitários da API aprovados (dois novos do seed) e dois novos testes transacionais de integração aprovados. Seis verificações reais de login pela API e pelo frontend confirmaram `200`/perfil correto para USER e ADMIN e `401` para o inativo; sessões de validação encerradas e contadores removidos. Estado final: três contas de demonstração, 16 imóveis e 16 características preservados. As permissões da Etapa 18 e funcionalidades privadas futuras permanecem pendentes.
  - Nova política de senha solicitada implementada: cadastro exige de 8 a 15 caracteres Unicode, ao menos uma maiúscula e um número, sem obrigar especiais/minúsculas nem bloquear sequências. Contrato REST exige `confirmPassword` igual, com validação no backend e sem armazenamento. Login aceita senhas não vazias de até 128 caracteres para preservar contas anteriores. Checklist de três critérios com ícone/texto e estados neutro/atendido durante a digitação; confirmação acompanha os dois campos, inclusive após erro de envio, mantendo foco e mensagens acessíveis.
  - Credenciais de demonstração atualizadas para `Usuario2026`, `Admin2026` e `Inativo2026`, nos mesmos e-mails/IDs/perfis/estados. Opção explícita `npm run db:seed:users -- --reset-passwords` validada e executada: três senhas atualizadas e sessões dessas contas revogadas. Atualizações exigem ID/e-mail conhecidos e preservam demais campos e usuários; reexecuções comuns continuam preservando senhas.
  - Validação da política nova: `npm test` aprovado com lint, tipos e 131 testes unitários; 14 testes de integração da API/seed aprovados, incluindo reset seguro e revogação de sessões. Builds dos dois apps e build final do frontend aprovados; 17 testes HTTP gerais e dois fluxos HTTP completos de autenticação aprovados, incluindo confirmação ausente/divergente e composição inválida. Novas credenciais conferidas diretamente e pelo frontend; senhas anteriores das contas ativas recusadas, inativo continua bloqueado. Navegador conferiu atualização dos critérios, igualdade/divergência, excesso de caracteres, foco e erro após envio, desktop e celular de 320 px sem transbordamento; console sem erros ou avisos e captura salva. Mantidos três usuários de demonstração, 16 imóveis e 16 características, sem sessões de validação restantes.
  - Revisão solicitada: caractere especial passou a ser obrigatório no contrato compartilhado e no cadastro, com pontuação/símbolos Unicode aceitos e espaços excluídos desse critério. Novo item “Pelo menos um caractere especial, ex.: @, !, #”, atualizado durante a digitação; contador acessível deriva automaticamente o total de quatro critérios. Mantidos os limites de 8–15 caracteres, maiúscula, número, confirmação e compatibilidade do login.
  - Senhas locais de demonstração atualizadas e conferidas: `Usuario2026!`, `Admin2026!` e `Inativo2026!`, preservando e-mails, IDs, nomes, perfis e atividade. `npm test` aprovado com 131 testes, lint e tipos; quatro testes transacionais do seed, builds dos dois apps, 17 testes HTTP gerais e dois fluxos de autenticação HTTP aprovados. Cobertos ausência de especial, exemplos de símbolos, limites, espaços que não contam como especial e indicador/foco no formulário. Navegador confirmou pendente/atendido e exemplos legíveis em 320 px, sem transbordamento nem erros no console. Três logins reais conferidos e sessões encerradas; permanecem três contas de demonstração, 16 imóveis e 16 características.
  - Botões de mostrar/ocultar implementados nos três campos solicitados: senha do login, senha e confirmação do cadastro. Ícones de olho, controles independentes com estado acessível e rótulos em pt-BR, acionamento por teclado e área de 44 px; alternância preserva o valor e não envia o formulário. Bloqueados durante a requisição e redefinidos para oculto após sucesso. Doze testes da interface aprovados, incluindo independência, preservação, envio pendente e limpeza/ocultação; lint, TypeScript no build do frontend e 17 testes HTTP aprovados. Navegador confirmou os três controles, teclado e layout em 320 px sem transbordamento ou erros no console. Frontend reiniciado com a versão atualizada; backend e contas preservados.
  - Feedback de requisições revisado conforme solicitado: spinner reutilizável com movimento reduzido, texto contextual, botões ocupados/desabilitados e prevenção de duplicação em login, cadastro, contato, logout e novas tentativas. Mensagens anteriores são limpas ao iniciar outro envio; sucesso continua dependendo da resposta real. Verificação inicial e atualização de sessão, landing e catálogo têm progresso visível; revalidações preservam os dados disponíveis e os skeletons existentes.
  - Busca da landing/catálogo, filtros e ordenação acompanham transições do Next.js com indicadores e bloqueio dos respectivos controles. Acrescentado fallback geral de navegação e progresso ao recuperar erro dos detalhes. Retry aguarda a Promise da consulta e libera nova tentativa após falha, sem rejeições não tratadas. Contratos e backend funcional preservados; contato continua com testes simulados, sem disparar e-mails de validação.
  - `npm test` aprovado com lint, tipos e 142 testes unitários, incluindo seis testes novos de requisições/transições controladas e três novos testes de autenticação pendente. Build final do frontend, lint final e 17 testes HTTP aprovados. Navegador confirmou spinner real do login, campos bloqueados durante a requisição, sucesso/erro após resposta, saída, busca e recuperação do catálogo pelo botão de nova tentativa. API local que havia parado de responder foi reiniciada, com recuperação e nova suíte HTTP aprovadas. Landing e catálogo conferidos em 320 px sem transbordamento. Dados preservados: 16 imóveis, 16 características e três contas de demonstração; sessão criada na validação encerrada, demais sessões preservadas.

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
