# Tarefas — Portal Imobiliário

> Execute as tarefas em ordem. Não comece a próxima até implementar e validar a atual.

## Fase 1 — Fundamentos

- [x] **Etapa 1 — Criar projeto Next.js**
  - Criar projeto com React e TypeScript.
  - Configurar a estrutura básica.
  - Criar `.env.example`.
  - Validar o servidor de desenvolvimento e o build.

- [x] **Etapa 2 — Layout e navegação**
  - Criar cabeçalho, navegação, rodapé e layout.
  - Adicionar um design responsivo básico.
  - Navegação: Início, Imóveis, Comprar, Alugar, Entrar.
  - Validado com `npm test`, `npm run build` e navegador em 360, 768 e 1280 px: links, menu móvel, teclado, Escape, foco e salto para o conteúdo; sem transbordamento horizontal nem erros no console.

- [ ] **Etapa 3 — Configurar PostgreSQL**
  - Configurar o PostgreSQL.
  - Selecionar e configurar o ORM.
  - Configurar as migrações.
  - Validar a conexão.

- [ ] **Etapa 4 — Criar modelo de domínio**
  - User.
  - Property.
  - PropertyImage.
  - Feature.
  - Favorite.
  - Inquiry.
  - Criar relacionamentos e restrições.
  - Executar as migrações.

- [ ] **Etapa 5 — Criar seed**
  - Imóveis realistas para venda e aluguel.
  - Casas, apartamentos, terrenos e escritórios.
  - Diferentes comunas, preços e características.

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
  - Imagem, título, preço, operação, localização, quartos, banheiros e área.
  - Criar grade responsiva.

- [ ] **Etapa 9 — Catálogo**
  - Criar `/properties`.
  - Consumir a API REST.
  - Exibir imóveis publicados.

- [ ] **Etapa 10 — Busca**
  - Busca textual.
  - Título, comuna, cidade, região e descrição.
  - Representar a busca nos parâmetros de consulta da URL.

- [ ] **Etapa 11 — Filtros**
  - Venda/aluguel.
  - Tipo.
  - Faixa de preço.
  - Quartos.
  - Banheiros.
  - Área mínima.
  - Comuna/cidade/região.
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
  - Construir a localização a partir de endereço, comuna, cidade e região.
  - Integrar o Google Maps.
  - Não solicitar latitude/longitude manualmente.

- [ ] **Etapa 16 — Contato com Web3Forms**
  - Formulário de contato.
  - Incluir ID/título do imóvel.
  - Estados de envio em andamento/sucesso/erro.
  - Validar os dados.

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
  - Preço.
  - Área útil/total.
  - Quartos, banheiros e vagas de garagem.
  - Idade do imóvel.
  - Endereço, comuna, cidade e região.
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
