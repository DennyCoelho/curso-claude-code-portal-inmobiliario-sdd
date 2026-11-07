# Portal Imobiliário — SDD

Portal imobiliário para o Brasil desenvolvido por meio de **Spec-Driven Development (SDD)** — desenvolvimento orientado por especificações.

A interface, os textos de acessibilidade, os metadados e a documentação utilizam português do Brasil (`pt-BR`).

## Contexto brasileiro

- Mercado: Brasil, com país `BR` definido automaticamente.
- Moeda: real brasileiro (`BRL`), com preços como `R$ 450.000,00` para venda e `R$ 2.500,00/mês` para aluguel.
- Endereço: logradouro, número, complemento opcional, bairro, cidade, estado (UF) e CEP no formato `00000-000`.
- Busca e filtros de localização: bairro, cidade e UF, com parâmetros `neighborhood`, `city` e `state`.
- Contato: telefone com DDD e prefixo internacional `+55`.
- Mapas e dados de demonstração: endereços e localidades do Brasil.

Esses padrões estão definidos em `spec.md`, `plan.md` e `tasks.md`. As Etapas 1 a 10 estão implementadas, incluindo a conexão com PostgreSQL, o fluxo de migrações, os modelos de domínio, o seed de imóveis brasileiros, a API REST pública de imóveis, a landing page, os cards em grade responsiva, o catálogo público e a busca textual. Os filtros, os mapas e o contato serão implementados nas respectivas etapas.

## Estrutura do monorepo

O repositório utiliza npm workspaces, com instalação e `package-lock.json` únicos na raiz:

```text
apps/
├── web/                # Frontend Next.js: páginas, componentes e consumo REST
└── api/                # Backend Next.js: Route Handlers, serviços, repositórios e Prisma
packages/
└── contracts/          # Tipos públicos REST compartilhados, sem dependências de banco
scripts/                # Testes HTTP entre os aplicativos
specs/                  # Especificação, plano técnico e tarefas SDD
```

Cada app possui seu `package.json`, configurações e ambiente. O frontend não importa código do backend; ambos utilizam `@portal-inmobiliario/contracts/public-property` para o contrato público dos imóveis. O ESLint bloqueia importações diretas entre os apps e dependências de banco no frontend.

## Desenvolvimento local

Requisitos: Node.js 20.19+, 22.12+ ou 24+ em uma versão compatível com Prisma 7, e npm 10 ou superior. A estrutura inicial foi preparada com Next.js 16.4.3, React 19.3.1 e TypeScript em modo estrito.

Na primeira configuração, execute a partir da raiz do repositório. Se os arquivos `.env.local` já existirem, preserve-os e pule as duas cópias:

```powershell
npm install
Copy-Item apps/web/.env.example apps/web/.env.local
Copy-Item apps/api/.env.example apps/api/.env.local
npm run dev
```

Na migração para o monorepo, o ambiente privado existente foi transferido de `apps/web/.env.local` para `apps/api/.env.local`.

`npm run dev` inicia o frontend em [http://localhost:3000](http://localhost:3000) e o backend em [http://localhost:3001](http://localhost:3001), com logs identificados e encerramento conjunto. Para trabalhar em terminais separados, utilize `npm run dev:web` e `npm run dev:api`.

A Etapa 2 inclui o layout compartilhado, o cabeçalho, o rodapé e a navegação responsiva. Em dispositivos móveis, o botão de menu exibe os links e permite fechar o menu com a tecla Escape. Também há um link para pular para o conteúdo usando o teclado.

O destino `/properties` exibe o catálogo público; `/login` continua como página provisória de navegação. Comprar e Alugar direcionam para `/properties?operation=SALE` e `/properties?operation=RENT`. O parâmetro `search` pesquisa efetivamente o catálogo na Etapa 10. A operação continua na URL e será aplicada junto aos demais filtros na Etapa 11. A autenticação segue a Etapa 17.

Cada app Next.js carrega seu próprio `.env.local`. O frontend recebe somente `API_URL`, com padrão local `http://127.0.0.1:3001`; o backend recebe `DATABASE_URL` e as credenciais privadas descritas em `apps/api/.env.example`.

A landing page mantém as chamadas relativas a `/api/properties`. O Next.js do frontend encaminha `/api/**` ao backend usando `rewrites`, preservando o caminho, os parâmetros de consulta e as respostas REST. O navegador utiliza a mesma origem da interface. O backend implementa os endpoints e acessa o PostgreSQL; as credenciais ficam exclusivamente nele.

O endpoint `GET /api/health` verifica se o backend está respondendo, sem consultar o banco. Pode ser acessado diretamente na porta 3001 ou pelo encaminhamento na porta 3000.

## Build e execução independente

```powershell
npm run build
npm start
```

O build compila cada aplicação separadamente. `npm start` serve as duas compilações nas portas 3000 e 3001. Para executar somente um app, use `npm run build:web` / `npm run start:web` ou `npm run build:api` / `npm run start:api`.

Para publicar em serviços separados, configure a raiz do app correspondente (`apps/web` ou `apps/api`) e disponibilize os workspaces do repositório durante a instalação. Defina `API_URL` no ambiente do frontend **antes do build**, apontando para a origem HTTP(S) do backend, sem o sufixo `/api`. O destino dos rewrites faz parte da compilação: alterá-lo exige recompilar o frontend. Configure banco e segredos somente no serviço do backend.

## Landing page

A página inicial inclui um hero com ilustração vetorial, busca principal, imóveis em destaque, seleções de compra e aluguel e chamadas para o catálogo. O cabeçalho, a navegação e o rodapé compartilhados foram preservados. O ícone da aba reutiliza a marca do portal por meio de `apps/web/src/app/icon.svg`.

Os componentes em `apps/web/src/components/home/` usam uma consulta a `GET /api/properties` pelo SWR, compartilhando o resultado entre as três seleções. Cada seção exibe até três imóveis, mantendo a ordem da API. A seleção de destaques usa `isFeatured`; compra e aluguel usam `SALE` e `RENT`. Os preços aparecem em BRL e os aluguéis têm `/mês`. Há estados de carregamento, seleção vazia e erro com botão para tentar novamente. A resposta REST é validada com Zod e a requisição tem limite de dez segundos.

A busca usa React Hook Form e Zod para validar até 200 caracteres e a operação. Ao enviar, navega para `/properties?search=...&operation=...`, removendo espaços externos e codificando acentos e caracteres especiais. Campos vazios são omitidos; sem texto ou operação, abre `/properties`. O formulário também tem ação GET nativa. O destino `/properties` aplica a busca textual no PostgreSQL; a operação e os demais filtros seguem a Etapa 11.

A Etapa 8 apresenta as três seleções com `PropertyCard` e `PropertyGrid`, reutilizáveis em `apps/web/src/components/properties/`. A grade usa uma coluna no celular, duas a partir de 640 px e três a partir de 1024 px. Cada card mostra operação, tipo, título, preço, bairro/cidade/UF, quartos e banheiros quando aplicáveis. A área útil aparece em m² com separadores brasileiros; na ausência dela, a área total é exibida e identificada. Campos nulos são omitidos e contagens iguais a zero são preservadas.

A imagem principal tem prioridade; sem principal, o card usa a menor posição. Imagens HTTPS do Cloudinary são exibidas com `next/image`, texto alternativo, proporção reservada e carregamento sob demanda. Imóvel sem foto, URL incompatível ou falha de carregamento exibe “Imagem indisponível”. O seed continua sem fotografias; nenhum dado do banco foi alterado. A landing mantém uma única consulta REST compartilhada entre as seleções, e a validação Zod também verifica os novos campos dos cards.

Com o PostgreSQL em execução e o seed carregado, abra a página inicial para visualizar as seleções. Sem banco disponível, a busca e as chamadas para ação continuam acessíveis e as seleções mostram uma mensagem de erro. A ilustração do hero é decorativa; nenhuma fotografia de imóvel foi inventada ou adicionada ao banco.

Execute `npm run home:test` para validar a seleção dos imóveis, os preços, a busca e seus parâmetros, o cliente REST e os estados das seções. `npm run property:test` verifica os cards e a grade, seleção de imagens, campos opcionais, áreas e conteúdo recebido da API. `npm test` verifica ESLint, TypeScript e testes unitários dos apps; `npm run build` valida as duas compilações de produção.

## Catálogo público

A Etapa 9 substitui a página provisória de `/properties` pelo catálogo de imóveis à venda e para alugar. A página exibe todos os imóveis retornados por `GET /api/properties`, mantendo a ordem da API e usando `PropertyCard` e `PropertyGrid`. A regra `isPublished: true` continua no backend; os rascunhos não são enviados ao navegador.

O catálogo informa a quantidade disponível, com singular e plural, e usa uma, duas ou três colunas conforme a largura da tela. Inclui carregamento anunciado, mensagem para catálogo vazio e erro com botão “Tentar novamente”. Os cards mantêm preços em BRL, aluguel mensal, localização brasileira, campos opcionais e o tratamento de imagens da Etapa 8.

O cliente REST em `apps/web/src/lib/api/properties.ts` e o hook `usePublicProperties` são compartilhados com a landing: SWR com a mesma chave `/api/properties` quando não houver busca, validação Zod dos campos utilizados, timeout de dez segundos e erro genérico em português. Cada abertura direta do catálogo usa uma consulta REST para a listagem solicitada. Não há acesso ao banco pelo frontend.

### Busca textual

A Etapa 10 permite pesquisar por título, bairro, cidade, UF e descrição. O formulário do catálogo permite alterar e limpar a busca, preservando os demais parâmetros da URL. A busca da landing chega ao mesmo fluxo. Por exemplo, [buscar São Paulo](http://localhost:3000/properties?search=S%C3%A3o+Paulo) preenche o campo ao abrir diretamente ou recarregar; voltar e avançar mantêm a correspondência entre URL, campo e resultados.

`GET /api/properties?search=...` executa a correspondência parcial no PostgreSQL, sem distinguir maiúsculas e minúsculas e mantendo os acentos. O termo é tratado literalmente, inclusive `%`, `_` e barra invertida. Apenas imóveis publicados são retornados, na ordem existente. O termo vazio ou formado por espaços equivale à listagem completa. A API remove espaços externos e retorna `400` para mais de 200 caracteres ou parâmetros `search` repetidos, antes de consultar o banco.

Cada termo normalizado possui uma chave SWR própria; o catálogo não filtra todos os imóveis no navegador nem apresenta dados de outra busca durante o carregamento. O resultado informa o termo e a quantidade encontrada. Sem correspondências, orienta a tentar outras palavras ou limpar a busca; falhas preservam a opção de tentar novamente. URLs inválidas exibem uma orientação e permitem corrigir ou limpar o termo sem consultar a API.

`npm run catalog:test` inclui validação, URLs, cache por termo, formulário GET e resultados da busca. `npm run api:test` verifica entrada HTTP e propagação ao serviço/repositório. `npm run api:test:integration` valida os cinco campos, publicação e caracteres literais no PostgreSQL com transações revertidas. `npm run test:smoke` verifica a busca e os erros pelo proxy entre os apps.

Para conferir a implementação, inicie os dois apps com o PostgreSQL existente em execução e abra [http://localhost:3000/properties](http://localhost:3000/properties). Execute `npm run catalog:test` para os testes de listagem completa, ordem, contagem, estados, integração com o cache SWR e composição da página. Esses testes também fazem parte de `npm test`; `npm run test:smoke` inclui a resposta HTTP da rota do catálogo.

## PostgreSQL e migrações

A Etapa 3 utiliza [Prisma ORM 7](https://www.prisma.io/docs/orm/v7), seguindo o curso, com Prisma Client, Prisma Migrate e o adaptador PostgreSQL `@prisma/adapter-pg`. O esquema fica em `apps/api/prisma/schema.prisma`, e as migrações SQL versionadas ficam em `apps/api/prisma/migrations/`. Os repositórios poderão obter o cliente pelo `getDatabase()` de `apps/api/src/lib/db/index.ts`, protegido com `server-only` e com reutilização das conexões.

`npm install` gera o Prisma Client automaticamente, e o build do backend também o regenera antes de compilar. O código gerado fica em `apps/api/src/generated/prisma/`, ignorado pelo Git. O frontend pode ser compilado sem gerar o Prisma Client. A geração e a validação do esquema podem ser executadas antes de configurar as credenciais do banco.

O ambiente local reutiliza o contêiner `postgres`, publicado na porta `5432`. Crie o banco do portal uma única vez, caso ainda não exista:

```powershell
docker exec postgres createdb -U postgres --encoding=UTF8 --template=template0 portal_inmobiliario
```

Em `apps/api/.env.local`, configure `DATABASE_URL` com o usuário e a senha do seu PostgreSQL, apontando para `localhost:5432/portal_inmobiliario`. Codifique caracteres especiais do usuário e da senha na URL. Esse arquivo é ignorado pelo Git.

Execute na raiz do repositório:

```powershell
npm run db:validate
npm run db:migrate
npm run db:status
npm run db:check
```

A migração inicial verifica a execução do fluxo e registra o histórico em `_prisma_migrations`. A migração `20261101040000_criar_modelo_dominio`, da Etapa 4, cria `User`, `Property`, `PropertyImage`, `Feature`, `Favorite` e `Inquiry`, além da tabela de associação entre imóveis e características. Para futuras alterações no esquema, crie uma nova migração de desenvolvimento e gere novamente o cliente:

```powershell
npm run db:migrate:dev -- --name=nome_da_alteracao
npm run db:generate
```

Para revisar o SQL antes de aplicá-lo, acrescente `--create-only` a `db:migrate:dev`; depois da revisão, execute `npm run db:migrate` e `npm run db:generate`. `db:migrate` aplica apenas as migrações pendentes; executá-lo novamente mantém as migrações já registradas. `db:status` compara o histórico local com o aplicado no banco. Os comandos de banco carregam os mesmos arquivos de ambiente da aplicação usando `@next/env` em `apps/api/prisma.config.ts`.

### Modelo de domínio

- `User`: nome, e-mail único, hash da senha, perfil `USER`/`ADMIN` e indicador de conta ativa. O padrão é `USER` ativo.
- `Property`: operações `SALE`/`RENT`, seis tipos de imóvel, preço `Decimal(14, 2)` em BRL, áreas `Decimal(12, 2)` em m², dados do imóvel e endereço brasileiro. Campos não aplicáveis, como quartos de um terreno, podem ser nulos. Novos imóveis começam despublicados e sem destaque.
- `PropertyImage`: URL e `publicId` único do Cloudinary, posição e indicação de imagem principal. O banco permite no máximo uma principal por imóvel e não armazena arquivos binários.
- `Feature`: características reutilizáveis com nome único e relacionamento de muitos para muitos com imóveis.
- `Favorite`: vínculo único entre usuário e imóvel.
- `Inquiry`: imóvel obrigatório, usuário opcional, nome, e-mail, telefone internacional e mensagem. Visitantes podem enviar consultas sem uma conta.

As datas usam `timestamptz(3)` e são representadas por `Date` no Prisma, permitindo transmitir UTC. `User` e `Property` têm datas de criação e atualização. Para os futuros contratos REST, os preços devem ser serializados com `price.toFixed(2)`, preservando as duas casas decimais.

As restrições SQL validam as 27 UFs, CEP textual de oito dígitos, país `BR`, preço e áreas positivos, contagens e posições não negativas e formato de telefone com `+55`. O país tem padrão `BR`. A atribuição no servidor e a validação completa dos dados de entrada serão implementadas com os respectivos serviços e endpoints.

Ao excluir um usuário, seus favoritos são removidos e suas consultas são preservadas com `userId` nulo. Ao excluir um imóvel, imagens, favoritos, consultas e associações com características são removidos; os usuários e as características continuam existindo. O futuro serviço de exclusão deverá coordenar a remoção dos arquivos no Cloudinary.

As restrições `CHECK` e o índice único parcial da imagem principal estão versionados no SQL da migração. Preserve essas regras ao criar migrações futuras; consulte o [fluxo de personalização de migrações do Prisma 7](https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/unsupported-database-features).

Para verificar o modelo no PostgreSQL já migrado:

```powershell
npm run db:test
```

Os testes de integração verificam persistência, precisão decimal, endereços brasileiros, unicidade, relacionamentos, exclusões e o seed. Cada cenário usa uma transação revertida, inclusive quando ocorre uma falha; nenhum registro de teste é mantido no banco. Os testes do seed isolam os IDs de demonstração dentro da transação e restauram todos os dados ao final, inclusive os vínculos existentes.

### Seed de desenvolvimento

Depois de configurar `DATABASE_URL` e aplicar as migrações, execute na raiz:

```powershell
npm run db:seed
```

O comando usa `prisma db seed`, configurado em `apps/api/prisma.config.ts`, e carrega o ambiente de `apps/api/.env.local`. A execução é explícita e cria os dados em uma única transação: em caso de falha, nenhuma alteração é confirmada. O comando recusa execução com `NODE_ENV=production`.

O conjunto inicial contém:

- 16 imóveis fictícios: quatro casas, quatro apartamentos, quatro terrenos e quatro escritórios, com oito ofertas de venda e oito de aluguel mensal.
- Sete cidades e UFs nas cinco regiões: São Paulo/SP, Curitiba/PR, Florianópolis/SC, Manaus/AM, Recife/PE, Salvador/BA e Brasília/DF.
- 14 imóveis publicados, dois rascunhos e seis destaques publicados.
- 16 características compartilhadas, como piscina, academia, jardim, elevador, acessibilidade e ar-condicionado.
- Preços e áreas decimais, datas distintas em UTC, CEPs textuais com oito dígitos, complementos opcionais e campos não aplicáveis nulos nos terrenos.

Os anúncios, números e complementos são fictícios, com localidades e CEPs brasileiros como referência; não representam ofertas reais. Os preços de venda são totais e os de aluguel são mensais em BRL, com encargos separados nas descrições. Imagens serão adicionadas pelo fluxo do Cloudinary na etapa correspondente.

O seed usa IDs fixos para imóveis e nomes únicos para características. Pode ser executado novamente sem duplicar registros ou vínculos, preservando preços, títulos, datas, publicação, características e outras edições locais dos imóveis já existentes. Também preserva os registros criados fora do seed. Para alterar os exemplos iniciais, edite `apps/api/prisma/seed-properties.ts`; essas mudanças serão aplicadas somente aos IDs ainda ausentes no banco.

Valide os exemplos sem banco e, depois, sua persistência no PostgreSQL:

```powershell
npm run seed:test
npm run db:test
```

`seed:test` valida os dados de demonstração e a recusa em produção. Os testes de integração verificam a inserção, o compartilhamento de características, a reexecução sem duplicações e a preservação de edições e registros independentes.

## API REST pública de imóveis

A Etapa 6 disponibiliza os seguintes endpoints, sem exigir autenticação:

| Requisição | Resposta de sucesso |
| ---------- | ------------------- |
| `GET /api/properties` | `200` com um array de imóveis publicados; `[]` quando não houver resultados. |
| `GET /api/properties/{id}` | `200` com um objeto de imóvel publicado. |

As duas respostas usam o contrato `PublicProperty`, em `packages/contracts/src/public-property.ts`: dados do imóvel e endereço brasileiro, indicador de destaque, datas, imagens e características. O preço é uma string decimal com duas casas, como `"450000.00"`; no aluguel, representa o valor mensal em BRL. As áreas também são strings decimais com duas casas ou `null`. As datas são strings ISO 8601 em UTC. O CEP mantém os oito dígitos, incluindo zeros iniciais. Campos não aplicáveis permanecem `null`; imagens e características ausentes são arrays vazios.

As imagens contêm `id`, `url`, `position` e `isMain`, em ordem de posição; as características contêm `id` e `name`, em ordem de nome. A API seleciona somente dados públicos: não retorna consultas, favoritos ou o `publicId` de gestão do Cloudinary. O seed ainda não inclui imagens.

Um UUID malformado retorna `400`. Um UUID válido de imóvel inexistente ou despublicado retorna a mesma resposta `404`, sem revelar a existência de rascunhos. Falhas inesperadas retornam `500` com uma mensagem genérica. Os erros seguem o formato `{ "message": "Imóvel não encontrado.", "status": 404 }`, sem detalhes internos. As respostas usam `Cache-Control: no-store` e as rotas são dinâmicas para refletir mudanças de publicação.

No backend `apps/api`, as rotas em `src/app/api/properties/` chamam o serviço em `src/services/public-property-service.ts`, que serializa os dados. O repositório em `src/repositories/public-property-repository.ts` consulta o Prisma com `isPublished: true` tanto na listagem quanto nos detalhes. A conexão é aberta somente quando uma consulta é executada. A listagem tem uma ordem estável por data de criação e ID; busca, filtros e opções de ordenação serão adicionados nas etapas correspondentes.

Com o banco migrado, o seed executado e o servidor iniciado, consulte no PowerShell:

```powershell
$properties = Invoke-RestMethod http://localhost:3000/api/properties
$properties.Count
Invoke-RestMethod "http://localhost:3000/api/properties/$($properties[0].id)"
```

Execute os testes automatizados a partir da raiz:

```powershell
npm run api:test
npm run api:test:integration
```

`api:test` verifica os serviços e os Route Handlers sem banco: serialização, campos opcionais, lista vazia, UUID, códigos HTTP, cache e mensagens de erro. `api:test:integration` exige PostgreSQL migrado e verifica as consultas reais, a exclusão de rascunhos, despublicação, relações e seleção de dados públicos. Os cenários de integração usam transações revertidas, sem manter registros ou alterações no banco. Os comandos usam a condição `react-server` do Node para respeitar os módulos protegidos com `server-only`.

Com os dois apps em execução, rode `npm run test:smoke` em outro terminal. O teste HTTP verifica a landing, a saúde do backend, o encaminhamento REST, listagem, detalhes e códigos `400` e `405`. A listagem exige PostgreSQL configurado e migrado. As URLs dos testes podem ser substituídas por `WEB_URL` e `API_URL` no ambiente do terminal.

## pgAdmin no Docker

O arquivo `compose.pgadmin.yaml` inicia a imagem oficial do [pgAdmin](https://www.pgadmin.org/docs/pgadmin4/latest/container_deployment.html), com `restart: always` (equivalente a `docker run --restart always`) e um volume persistente para contas, servidores e preferências.

Na primeira configuração, copie o exemplo e defina uma senha local em `.env.pgadmin.local`:

```powershell
Copy-Item docker/pgadmin/.env.example .env.pgadmin.local
```

Depois de preencher `PGADMIN_DEFAULT_PASSWORD`, inicie:

```powershell
docker compose -f compose.pgadmin.yaml up -d
```

Abra [http://localhost:5050](http://localhost:5050). Use o e-mail `admin@example.com` e a senha de `.env.pgadmin.local`, ignorado pelo Git. Esse arquivo já contém as credenciais de acesso local configuradas nesta máquina.

O servidor **Portal Imobiliário — PostgreSQL local** é importado automaticamente. Ao conectar, informe a senha do usuário `postgres` do contêiner existente. O pgAdmin usa `host.docker.internal:5432` para acessar o PostgreSQL pelo Docker Desktop; `localhost` dentro do pgAdmin apontaria para o próprio contêiner. O banco inicial é `portal_inmobiliario`.

Para consultar o estado e os registros:

```powershell
docker compose -f compose.pgadmin.yaml ps
docker compose -f compose.pgadmin.yaml logs --tail 50 pgadmin
```

O acesso HTTP fica restrito a esta máquina (`127.0.0.1:5050`). O volume preserva os dados ao recriar o contêiner. Alterar a senha inicial no arquivo de ambiente não modifica a senha de uma conta já criada; nesse caso, altere-a pelo próprio pgAdmin.

## Comandos

| Comando             | Finalidade                                             |
| ------------------- | ------------------------------------------------------ |
| `npm run dev`       | Iniciar frontend e backend em desenvolvimento.        |
| `npm run dev:web` / `npm run dev:api` | Iniciar somente o app escolhido. |
| `npm run build`     | Gerar e verificar as duas compilações de produção.     |
| `npm run build:web` / `npm run build:api` | Compilar somente o app escolhido. |
| `npm start`         | Servir frontend e backend em produção.                 |
| `npm run start:web` / `npm run start:api` | Servir somente o app escolhido. |
| `npm run lint`      | Executar o ESLint sem permitir avisos.                 |
| `npm run typecheck` | Gerar os tipos das rotas e verificar o TypeScript.     |
| `npm test`          | Executar ESLint, TypeScript e testes unitários.        |
| `npm run test:unit` | Executar os testes de API, seed e landing sem banco.   |
| `npm run test:integration` | Executar os testes de domínio, seed e API no PostgreSQL. |
| `npm run test:smoke` | Validar por HTTP os dois apps já iniciados.           |
| `npm run db:check`  | Validar a conexão real com o PostgreSQL usando o ORM. |
| `npm run db:test`   | Testar o modelo, as restrições e o seed no PostgreSQL migrado. |
| `npm run seed:test` | Validar os exemplos do seed sem conexão com o banco. |
| `npm run api:test` | Testar os serviços e as rotas públicas sem banco. |
| `npm run api:test:integration` | Testar as consultas públicas no PostgreSQL migrado. |
| `npm run home:test` | Testar a landing page, a busca e o consumo REST sem banco. |
| `npm run db:seed`   | Popular o banco de desenvolvimento com imóveis brasileiros. |
| `npm run db:generate` | Gerar o Prisma Client a partir do esquema. |
| `npm run db:migrate` | Aplicar as migrações pendentes ao PostgreSQL. |
| `npm run db:migrate:dev` | Criar e aplicar uma migração em desenvolvimento. |
| `npm run db:validate` | Validar o esquema do Prisma. |
| `npm run db:status` | Consultar a consistência do histórico de migrações. |

`npm test` executa as validações estáticas e os testes unitários. `npm run seed:test` valida os exemplos de demonstração sem banco. `npm run api:test` verifica os serviços e as rotas da API pública sem banco. `npm run db:check` valida uma consulta real pelo ORM. `npm run db:test` executa os testes de integração do modelo de domínio e do seed. `npm run api:test:integration` verifica a persistência usada pela API pública. Os comandos que acessam o banco exigem PostgreSQL em execução e `DATABASE_URL` configurada.

Para verificar a versão de produção:

```powershell
npm run build
npm start
```

## Estrutura

```text
.
├── apps/
│   ├── web/                  # Frontend Next.js
│   │   ├── .env.example      # Origem HTTP do backend
│   │   └── src/
│   │       ├── app/          # Páginas e layouts
│   │       ├── components/   # Interface reutilizável
│   │       └── lib/          # Interface e cliente REST
│   └── api/                  # Backend Next.js
│       ├── .env.example      # Banco e integrações privadas
│       ├── prisma/           # Esquema, migrações e seed
│       └── src/
│           ├── app/api/      # Route Handlers REST
│           ├── services/     # Lógica da aplicação
│           ├── repositories/ # Persistência
│           └── lib/          # Banco e respostas HTTP
├── packages/contracts/      # Contratos REST TypeScript
├── scripts/                  # Testes HTTP do monorepo
├── package.json              # Monorepo com npm workspaces
├── CLAUDE.md
└── specs/
    └── portal-inmobiliario/
        ├── spec.md
        ├── plan.md
        └── tasks.md
```

A landing page já consome a API REST pública no navegador. Os Route Handlers de imóveis coordenam serviços e repositórios para acessar o PostgreSQL; as demais telas seguirão as próximas tarefas.

## Documentos

### `CLAUDE.md`

Contém as instruções permanentes que o Claude Code deve seguir durante o desenvolvimento.

### `spec.md`

Define **o que a aplicação deve fazer**: funcionalidades, usuários, imóveis, filtros, imagens, localização, contato, administração e critérios de aceitação.

### `plan.md`

Define **como a aplicação será construída tecnicamente**: arquitetura, PostgreSQL, API REST, autenticação, Cloudinary, Google Maps, Web3Forms e separação de responsabilidades.

### `tasks.md`

Divide a implementação em uma sequência incremental de tarefas.

## Começar com o Claude Code

Abra o Claude Code a partir da raiz do repositório e utilize:

```text
Leia CLAUDE.md e todos os documentos do diretório
specs/portal-inmobiliario/.

Analise a especificação, o plano técnico e a lista de tarefas.

Comece apenas pela primeira tarefa pendente de tasks.md.
Não avance para a próxima tarefa até que eu solicite.
```

Para continuar posteriormente:

```text
Continue com a próxima tarefa pendente de tasks.md.

Consulte spec.md e plan.md quando necessário.
Implemente apenas essa tarefa, valide as alterações e marque-a
como concluída quando estiver corretamente finalizada.

Não avance para a próxima tarefa.
```
