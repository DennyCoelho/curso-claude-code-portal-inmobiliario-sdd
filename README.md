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

Esses padrões estão definidos em `spec.md`, `plan.md` e `tasks.md`. As Etapas 1 a 5 estão implementadas, incluindo a conexão com PostgreSQL, o fluxo de migrações, os modelos de domínio e o seed de imóveis brasileiros. Os filtros, os mapas e o contato serão implementados nas respectivas etapas.

## Desenvolvimento local

Requisitos: Node.js 20.19+, 22.12+ ou 24+ em uma versão compatível com Prisma 7, e npm 10 ou superior. A estrutura inicial foi preparada com Next.js 16.4.3, React 19.3.1 e TypeScript em modo estrito.

Execute a partir da raiz do repositório:

```powershell
npm install
Copy-Item .env.example apps/web/.env.local
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000). A Etapa 2 inclui o layout compartilhado, o cabeçalho, o rodapé e a navegação responsiva. Em dispositivos móveis, o botão de menu exibe os links e permite fechar o menu com a tecla Escape. Também há um link para pular para o conteúdo usando o teclado.

Os destinos `/properties` e `/login` são páginas provisórias de navegação. Comprar e Alugar direcionam para `/properties?operation=SALE` e `/properties?operation=RENT`; o catálogo, os filtros e a autenticação serão implementados nas respectivas etapas.

O Next.js carrega as variáveis de ambiente de `apps/web/.env.local`, pois esse é o diretório da aplicação. O arquivo `.env.example` documenta a configuração. A interface inicial ainda não consulta o banco; os comandos de banco exigem PostgreSQL e `DATABASE_URL`. Preencha as credenciais das integrações nas tarefas correspondentes e mantenha os segredos no servidor.

## PostgreSQL e migrações

A Etapa 3 utiliza [Prisma ORM 7](https://www.prisma.io/docs/orm/v7), seguindo o curso, com Prisma Client, Prisma Migrate e o adaptador PostgreSQL `@prisma/adapter-pg`. O esquema fica em `apps/web/prisma/schema.prisma`, e as migrações SQL versionadas ficam em `apps/web/prisma/migrations/`. Os repositórios poderão obter o cliente pelo `getDatabase()` de `apps/web/src/lib/db/index.ts`, protegido com `server-only` e com reutilização das conexões.

`npm install` gera o Prisma Client automaticamente, e o build também o regenera antes de compilar. O código gerado fica em `apps/web/src/generated/prisma/`, ignorado pelo Git. A geração e a validação do esquema podem ser executadas antes de configurar as credenciais do banco.

O ambiente local reutiliza o contêiner `postgres`, publicado na porta `5432`. Crie o banco do portal uma única vez, caso ainda não exista:

```powershell
docker exec postgres createdb -U postgres --encoding=UTF8 --template=template0 portal_inmobiliario
```

Em `apps/web/.env.local`, configure `DATABASE_URL` com o usuário e a senha do seu PostgreSQL, apontando para `localhost:5432/portal_inmobiliario`. Codifique caracteres especiais do usuário e da senha na URL. Esse arquivo é ignorado pelo Git.

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

Para revisar o SQL antes de aplicá-lo, acrescente `--create-only` a `db:migrate:dev`; depois da revisão, execute `npm run db:migrate` e `npm run db:generate`. `db:migrate` aplica apenas as migrações pendentes; executá-lo novamente mantém as migrações já registradas. `db:status` compara o histórico local com o aplicado no banco. Os comandos de banco carregam os mesmos arquivos de ambiente da aplicação usando `@next/env` em `apps/web/prisma.config.ts`.

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

O comando usa `prisma db seed`, configurado em `apps/web/prisma.config.ts`, e carrega o ambiente de `apps/web/.env.local`. A execução é explícita e cria os dados em uma única transação: em caso de falha, nenhuma alteração é confirmada. O comando recusa execução com `NODE_ENV=production`.

O conjunto inicial contém:

- 16 imóveis fictícios: quatro casas, quatro apartamentos, quatro terrenos e quatro escritórios, com oito ofertas de venda e oito de aluguel mensal.
- Sete cidades e UFs nas cinco regiões: São Paulo/SP, Curitiba/PR, Florianópolis/SC, Manaus/AM, Recife/PE, Salvador/BA e Brasília/DF.
- 14 imóveis publicados, dois rascunhos e seis destaques publicados.
- 16 características compartilhadas, como piscina, academia, jardim, elevador, acessibilidade e ar-condicionado.
- Preços e áreas decimais, datas distintas em UTC, CEPs textuais com oito dígitos, complementos opcionais e campos não aplicáveis nulos nos terrenos.

Os anúncios, números e complementos são fictícios, com localidades e CEPs brasileiros como referência; não representam ofertas reais. Os preços de venda são totais e os de aluguel são mensais em BRL, com encargos separados nas descrições. Imagens serão adicionadas pelo fluxo do Cloudinary na etapa correspondente.

O seed usa IDs fixos para imóveis e nomes únicos para características. Pode ser executado novamente sem duplicar registros ou vínculos, preservando preços, títulos, datas, publicação, características e outras edições locais dos imóveis já existentes. Também preserva os registros criados fora do seed. Para alterar os exemplos iniciais, edite `apps/web/prisma/seed-properties.ts`; essas mudanças serão aplicadas somente aos IDs ainda ausentes no banco.

Valide os exemplos sem banco e, depois, sua persistência no PostgreSQL:

```powershell
npm run seed:test
npm run db:test
```

`seed:test` valida os dados de demonstração e a recusa em produção. Os testes de integração verificam a inserção, o compartilhamento de características, a reexecução sem duplicações e a preservação de edições e registros independentes.

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
| `npm run dev`       | Iniciar o servidor de desenvolvimento.                 |
| `npm run build`     | Gerar e verificar a compilação de produção.            |
| `npm start`         | Servir a compilação de produção.                       |
| `npm run lint`      | Executar o ESLint sem permitir avisos.                 |
| `npm run typecheck` | Gerar os tipos das rotas e verificar o TypeScript.     |
| `npm test`          | Executar as validações estáticas: ESLint e TypeScript. |
| `npm run db:check`  | Validar a conexão real com o PostgreSQL usando o ORM. |
| `npm run db:test`   | Testar o modelo, as restrições e o seed no PostgreSQL migrado. |
| `npm run seed:test` | Validar os exemplos do seed sem conexão com o banco. |
| `npm run db:seed`   | Popular o banco de desenvolvimento com imóveis brasileiros. |
| `npm run db:generate` | Gerar o Prisma Client a partir do esquema. |
| `npm run db:migrate` | Aplicar as migrações pendentes ao PostgreSQL. |
| `npm run db:migrate:dev` | Criar e aplicar uma migração em desenvolvimento. |
| `npm run db:validate` | Validar o esquema do Prisma. |
| `npm run db:status` | Consultar a consistência do histórico de migrações. |

`npm test` executa as validações estáticas. `npm run seed:test` valida os exemplos de demonstração sem banco. `npm run db:check` valida uma consulta real pelo ORM. `npm run db:test` executa os testes de integração do modelo de domínio e do seed. Os comandos que acessam o banco exigem PostgreSQL em execução e `DATABASE_URL` configurada.

Para verificar a versão de produção:

```powershell
npm run build
npm start
```

## Estrutura

```text
.
├── apps/
│   └── web/
│       └── src/
│           ├── app/           # App Router e futuros Route Handlers em api/
│           ├── components/    # Interface reutilizável
│           ├── services/      # Lógica da aplicação
│           ├── repositories/  # Persistência
│           ├── lib/           # Utilitários e clientes
│           └── types/         # Tipos compartilhados
├── .env.example
├── package.json              # Monorepo com npm workspaces
├── CLAUDE.md
└── specs/
    └── portal-inmobiliario/
        ├── spec.md
        ├── plan.md
        └── tasks.md
```

O frontend consumirá uma API REST; os Route Handlers coordenarão serviços e repositórios para acessar o PostgreSQL. As pastas estão preparadas, mas as funcionalidades das próximas tarefas ainda não foram implementadas.

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
