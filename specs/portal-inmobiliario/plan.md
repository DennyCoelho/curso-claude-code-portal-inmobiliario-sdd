# Plano técnico — Portal Imobiliário

## 1. Arquitetura

O projeto utiliza um monorepo npm workspaces com duas aplicações Next.js independentes e um pacote de contratos públicos. As versões existentes de Next.js e React são preservadas nesta migração.

```text
apps/web — Next.js + React (porta 3000)
      │
    fetch()
      │
      ▼
apps/api — Next.js Route Handlers (porta 3001)
      │
      ▼
Camada de serviços
      │
      ▼
Repositório / ORM
      │
      ▼
PostgreSQL
```

O navegador mantém as chamadas relativas a `/api/**`. O frontend encaminha essas requisições ao backend por `rewrites`, com destino configurado pela variável de servidor `API_URL`. Caminhos, parâmetros de consulta e códigos HTTP devem ser preservados. `API_URL` deve ser definida antes do build do frontend, pois os rewrites integram a compilação. O backend também pode ser executado e publicado de forma independente.

`packages/contracts` expõe apenas tipos públicos, sem importar Prisma ou código dos aplicativos. Os aplicativos dependem desse pacote; não importam código um do outro. Prisma, serviços, repositórios, migrações, seed e seus testes pertencem exclusivamente a `apps/api`.

Integrações externas:

```text
Cloudinary  → imagens
Google Maps → localização
Web3Forms   → contato
```

## 2. Tecnologias obrigatórias

- Next.js
- React
- TypeScript
- PostgreSQL
- API REST com Route Handlers do Next.js
- Cloudinary
- Google Maps
- Web3Forms

### Contexto brasileiro

- Mercado e país: Brasil (`BR`).
- Idioma da interface, acessibilidade e metadados: português do Brasil (`pt-BR`).
- Moeda: real brasileiro (`BRL`), exibido com `Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })`.
- Preço de venda: valor total. Preço de aluguel: valor mensal, identificado com `/mês` na interface.
- Datas: persistir e transmitir em UTC; exibir em `pt-BR` com fuso explícito, usando `America/Sao_Paulo` como padrão do portal.
- Telefone de contato: aceitar DDD e prefixo `+55`, normalizar para formato internacional e validar no servidor.

Esses requisitos orientam as etapas futuras; a implementação deve continuar seguindo a ordem de `tasks.md`.

## 3. Restrições

- Não utilizar Server Actions.
- Não acessar o PostgreSQL diretamente a partir de componentes React.
- Não armazenar imagens binárias no PostgreSQL.
- Não exigir latitude/longitude no formulário ADMIN.
- Não implementar funcionalidades especulativas fora de `spec.md`.

## 4. Estrutura sugerida

```text
apps/
├── web/                       # Frontend Next.js
│   ├── src/app/                # Páginas, layouts e metadados
│   ├── src/components/
│   ├── src/lib/                # Interface e cliente REST
│   └── scripts/                # Testes da interface
└── api/                       # Backend Next.js
    ├── src/app/api/            # Route Handlers REST
    ├── src/services/
    ├── src/repositories/
    ├── src/lib/db/
    ├── prisma/                # Esquema, migrações e seed
    └── scripts/               # Testes de API e persistência
packages/
└── contracts/src/             # Tipos REST compartilhados
scripts/                      # Testes HTTP do monorepo
```

Cada aplicativo possui suas próprias configurações Next.js, TypeScript, ESLint e ambiente. A instalação e o lockfile npm ficam na raiz. `npm run dev` e `npm start` executam os dois apps; build, lint e verificação de tipos abrangem os workspaces. Os comandos de banco continuam disponíveis na raiz e são delegados ao backend.

## 5. Modelo de dados

Entidades:

- User
- Property
- PropertyImage
- Feature
- Favorite
- Inquiry

Relacionamentos:

```text
User 1 --- * Favorite * --- 1 Property
User 1 --- * Inquiry  * --- 1 Property

Property 1 --- * PropertyImage
Property * --- * Feature
```

`Inquiry.userId` pode ser nulo para permitir consultas de visitantes.

Implementação da Etapa 4:

- Identificadores UUID e datas `timestamptz(3)`; `User` e `Property` possuem `createdAt` e `updatedAt`.
- `User` armazena `passwordHash`, perfil `USER`/`ADMIN` e `isActive`, com padrões `USER` e `true`.
- `Property` utiliza `PropertyOperation` (`SALE`, `RENT`) e `PropertyType` (os seis valores da especificação), `price Decimal(14, 2)` e áreas opcionais `Decimal(12, 2)`. Quartos, banheiros, vagas e idade podem ser nulos quando não se aplicarem. `isPublished` e `isFeatured` começam como `false`.
- `PropertyImage` armazena `url`, `publicId` único, `position` e `isMain`. Um índice único parcial limita a uma imagem principal por imóvel, permitindo várias secundárias.
- `Feature.name` é único; a associação de muitos para muitos é gerenciada pelo Prisma sem novas colunas em `Property`.
- `Inquiry` mantém os dados de contato e aceita `userId` nulo. Excluir um usuário remove seus favoritos e mantém suas consultas, desvinculando a conta. Excluir um imóvel remove imagens, favoritos, consultas e vínculos com características; usuários e características são preservados. O serviço futuro deve coordenar a exclusão no Cloudinary.
- Restrições `CHECK` em SQL protegem UF brasileira em maiúsculas, CEP com oito dígitos, país `BR`, valores positivos de preço e áreas, contagens e posições não negativas e formato internacional do telefone com `+55`. A validação completa de entrada e a normalização pertencem aos futuros serviços REST.
- Índices apoiam listagens públicas por data, operação/tipo e preço, localização por UF/cidade/bairro, ordenação de imagens e consultas por usuário ou imóvel. A chave composta dos favoritos também atende à busca por usuário.

Na implementação de `Property`, utilizar os seguintes campos de localização:

| Campo técnico       | Significado | Regra                                                                              |
| ------------------- | ----------- | ---------------------------------------------------------------------------------- |
| `address`           | Logradouro  | Rua, avenida ou equivalente.                                                       |
| `addressNumber`     | Número      | Texto, permitindo `s/n`.                                                           |
| `addressComplement` | Complemento | Opcional.                                                                          |
| `neighborhood`      | Bairro      | Texto.                                                                             |
| `city`              | Cidade      | Texto.                                                                             |
| `state`             | Estado (UF) | UF brasileira válida em maiúsculas.                                                |
| `postalCode`        | CEP         | Texto com oito dígitos, preservando zeros à esquerda; máscara apenas na interface. |
| `country`           | País        | `BR`, atribuído pelo servidor.                                                     |

Os preços devem utilizar um tipo decimal exato com duas casas decimais no PostgreSQL, em BRL. Não armazenar o texto formatado com `R$`, pontos de milhar ou vírgula decimal. Na API, representar valores monetários como strings decimais, por exemplo, `"450000.00"`; a interface aplica a formatação brasileira.

## 6. Persistência

O PostgreSQL é o único banco de dados.

ORM selecionado na Etapa 3, seguindo o curso: **Prisma ORM 7**, com Prisma Client, adaptador `@prisma/adapter-pg`, driver `pg` (node-postgres) e Prisma Migrate para migrações SQL versionadas.

- Configuração em `apps/api/prisma.config.ts`, carregando `apps/api/.env.local` com `@next/env`.
- Cliente com pool de conexões reutilizado no servidor, acessado pelos repositórios por `getDatabase()` em `src/lib/db/index.ts`, protegido com `server-only`.
- Esquema em `apps/api/prisma/schema.prisma` e migrações em `apps/api/prisma/migrations/`, preservando o histórico existente.
- Prisma Client gerado em `apps/api/src/generated/prisma/`, ignorado pelo Git e regenerado na instalação e antes do build do backend. A conexão é validada por uma consulta SQL pelo Prisma.
- A migração inicial valida o fluxo sem criar entidades; `20261101040000_criar_modelo_dominio` cria as seis entidades e a associação entre características e imóveis em uma transação, com chaves estrangeiras, índices e restrições adicionais em SQL.
- `npm run db:test` valida o modelo no PostgreSQL com transações revertidas, sem manter registros de teste. Preservar os `CHECK` e o índice único parcial ao gerar novas migrações.
- Seed da Etapa 5 em `apps/api/prisma/seed.ts`, com exemplos em `seed-properties.ts` e persistência em `seed-database.ts`. Executar explicitamente com `npm run db:seed`, integrado ao `prisma db seed`, após as migrações.
- O seed de desenvolvimento cria 16 imóveis fictícios (casas, apartamentos, terrenos e escritórios), oito de venda e oito de aluguel mensal, em sete cidades/UFs nas cinco regiões brasileiras, com 16 características compartilhadas, 14 publicados, dois rascunhos e seis destaques. Valores monetários partem de strings decimais, país `BR` e datas fixas em UTC.
- A execução é transacional e recusa `NODE_ENV=production`. IDs fixos e `upsert` com atualização vazia preservam edições e registros existentes, sem duplicar imóveis, características ou vínculos ao repetir o comando. A Etapa 5 não cria contas ou imagens; o fluxo de imagens segue a etapa de integração com Cloudinary.
- `npm run seed:test` valida os exemplos sem conexão; `npm run db:test` também verifica a persistência e a reexecução do seed em transações revertidas.
- Desenvolvimento local: banco `portal_inmobiliario` no PostgreSQL já existente no Docker; pgAdmin em `http://localhost:5050`, com volume persistente e política `restart: always`.

Requisitos:

- migrações;
- chaves estrangeiras;
- restrições de unicidade;
- índices quando justificados;
- seed para desenvolvimento com cidades e bairros brasileiros, UFs válidas, CEPs coerentes e preços de venda e aluguel em BRL.

Restrições importantes:

- `User.email` único;
- combinação `(userId, propertyId)` única nos favoritos.

## 7. API REST

Imóveis públicos:

```text
GET /api/properties
GET /api/properties/{id}
```

Implementação da Etapa 6:

- Route Handlers dinâmicos em `apps/api/src/app/api/properties/`, executados no Node.js, com respostas JSON e `Cache-Control: no-store`. Os caminhos de serviços, repositórios e banco desta seção são relativos a `apps/api`.
- Serviço `src/services/public-property-service.ts` para serialização e repositório `src/repositories/public-property-repository.ts` para consultas Prisma. Serviços e persistência são protegidos com `server-only`; o cliente do banco é obtido apenas ao executar consultas.
- As duas consultas exigem `isPublished: true` no PostgreSQL e selecionam explicitamente os dados públicos. Consultas de contato, favoritos e `publicId` do Cloudinary não integram o contrato público.
- `GET /api/properties` retorna um array de `PublicProperty` (ou `[]`), com ordem estável por `createdAt` decrescente e ID crescente. `GET /api/properties/{id}` retorna um objeto do mesmo tipo, com imagens por posição e características por nome. Busca, filtros e opções de ordenação seguem as etapas posteriores.
- Contrato em `packages/contracts/src/public-property.ts`, importado como `@portal-inmobiliario/contracts/public-property`: preço e áreas como strings decimais com duas casas, campos opcionais nulos, datas ISO 8601 em UTC, CEP textual de oito dígitos e país `BR`. Imagens expõem `id`, `url`, `position` e `isMain`; características expõem `id` e `name`.
- UUID malformado retorna `400` antes da consulta; imóvel inexistente ou despublicado retorna a mesma resposta `404`. Erros inesperados retornam `500` com mensagem genérica em português, sem detalhes internos. Erros seguem `{ message, status }`.
- `npm run api:test` verifica serviços e Route Handlers sem banco. `npm run api:test:integration` verifica a persistência real e o contrato público, com transações revertidas. Ambos usam a condição `react-server` para os módulos `server-only`.

Autenticação:

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

Favoritos:

```text
GET    /api/favorites
POST   /api/favorites/{propertyId}
DELETE /api/favorites/{propertyId}
```

Consultas:

```text
POST /api/inquiries
```

Administração:

```text
GET    /api/admin/properties
POST   /api/admin/properties
GET    /api/admin/properties/{id}
PUT    /api/admin/properties/{id}
DELETE /api/admin/properties/{id}
```

Criar recursos REST adicionais quando necessários para:

- imagens;
- características;
- usuários;
- consultas.

## 8. Responsabilidades

### Route Handlers

- receber e analisar requisições HTTP;
- validar os dados básicos de entrada;
- invocar serviços;
- retornar respostas HTTP.

### Serviços

- lógica da aplicação;
- regras de negócio;
- coordenação da persistência e das integrações.

### Repositórios / ORM

- persistência;
- consultas ao PostgreSQL;
- sem lógica de apresentação.

### React

- interface;
- interação;
- estado visual;
- consumo de REST;
- sem acesso direto ao banco de dados.

### Landing page — Etapa 7

Os caminhos desta seção são relativos a `apps/web`. A interface acessa o backend exclusivamente pela API REST.

- Página inicial em `src/app/page.tsx`, com hero, ilustração SVG decorativa, busca, seleções de imóveis e chamadas para o catálogo. Componentes específicos em `src/components/home/`, mantendo cabeçalho e rodapé compartilhados.
- `HomePropertyCollections` consome `GET /api/properties` no navegador por SWR, com uma consulta compartilhada entre as seleções. Não importa serviços, repositórios ou Prisma. A resposta é validada com Zod somente nos campos usados pela landing, com timeout de dez segundos e erro genérico em português.
- `selectHomeProperties` limita cada seleção a três itens, preservando a ordem da API: `isFeatured` para destaques e `operation` para venda/aluguel. Preços em BRL com `Intl.NumberFormat`, incluindo `/mês` no aluguel. Listas resumidas nesta etapa; `PropertyCard` e grade de imóveis seguem a Etapa 8.
- `HomeSearch` utiliza React Hook Form e Zod, aceita texto opcional de até 200 caracteres e operação opcional `SALE`/`RENT`. Navega por GET para `/properties` usando `search` e `operation`, com valores codificados por `URLSearchParams`. A implementação do catálogo, da busca efetiva e dos filtros permanece nas Etapas 9 a 11.
- Estados locais de carregamento, seleção vazia e falha com nova tentativa, sem impedir o uso da busca e das chamadas para ação. Testes unitários em `scripts/home.test.tsx`, executados por `npm run home:test`.

## 9. Busca e filtros

`GET /api/properties` deve aceitar parâmetros como:

```text
search
operation
type
minPrice
maxPrice
bedrooms
bathrooms
minUsableArea
neighborhood
city
state
sort
```

Os filtros de localização devem usar `neighborhood` (bairro), `city` (cidade) e `state` (UF). Validar a UF no servidor. Exemplo:

```text
/api/properties?operation=SALE&neighborhood=pinheiros&city=sao-paulo&state=SP
```

Os parâmetros `minPrice` e `maxPrice` representam valores em BRL, sem formatação monetária, usando ponto como separador decimal, por exemplo, `minPrice=250000.00`.

A filtragem e a ordenação devem ser executadas principalmente no PostgreSQL, sem carregar todo o catálogo no navegador.

## 10. Autenticação e autorização

Utilizar um mecanismo seguro compatível com a API REST.

Requisitos:

- hashing de senhas;
- armazenamento seguro de sessão/token;
- autorização no servidor;
- não armazenar tokens sensíveis em `localStorage`;
- usuários inativos não podem se autenticar;
- endpoints ADMIN exigem o perfil ADMIN;
- endpoints privados USER exigem autenticação.

## 11. Cloudinary

Fluxo:

```text
ADMIN
  │
seleciona arquivo
  │
  ▼
API REST
  │
  ▼
Cloudinary
  │
 URL + publicId
  │
  ▼
PostgreSQL
```

Validar:

- tipo;
- tamanho;
- autorização.

A exclusão deve manter o Cloudinary e o PostgreSQL sincronizados.

## 12. Google Maps

Construir a localização utilizando:

- logradouro;
- número;
- bairro;
- cidade;
- estado (UF);
- CEP;
- Brasil como país.

Usar os campos `address`, `addressNumber`, `neighborhood`, `city`, `state` e `postalCode`, acrescentando `Brasil` ao montar a consulta. O complemento é opcional e pode ser omitido do mapa. Configurar a apresentação em português do Brasil quando a integração permitir idioma e país.

Não solicitar coordenadas manualmente.

Se posteriormente for necessária uma geocodificação interna, ela deve ser transparente para o ADMIN e não alterar os campos obrigatórios do formulário.

## 13. Web3Forms

Fluxo:

1. validar os dados;
2. identificar o imóvel;
3. identificar o usuário autenticado, quando houver;
4. persistir a consulta;
5. enviar por meio do Web3Forms;
6. retornar uma resposta REST consistente.

Definir um comportamento claro em caso de falhas para evitar a perda silenciosa de uma consulta.

## 14. Erros

Utilizar códigos HTTP apropriados:

- 400
- 401
- 403
- 404
- 409
- 500

Formato recomendado:

```json
{
  "message": "Imóvel não encontrado",
  "status": 404
}
```

Não expor stack traces internos.

## 15. Variáveis de ambiente

Utilizar variáveis de ambiente para:

- conexão com o PostgreSQL;
- segredos de autenticação;
- credenciais do Cloudinary;
- configuração do Google Maps;
- chave do Web3Forms.

Manter um `.env.example` sem segredos reais em cada aplicativo. `apps/web/.env.local` contém `API_URL`; `apps/api/.env.local` contém `DATABASE_URL` e as credenciais de servidor. Os arquivos locais existentes são transferidos para o backend sem exibir ou alterar os segredos. O frontend não recebe credenciais do banco nem das integrações privadas.

## 16. Validação

Validar, no mínimo:

- build;
- migrações;
- endpoints REST;
- autenticação;
- autorização;
- filtros;
- favoritos;
- consultas;
- upload/exclusão no Cloudinary;
- CRUD ADMIN;
- comportamento responsivo;
- contexto brasileiro: BRL, aluguel mensal, UF, CEP com zeros à esquerda, filtros por bairro/cidade/UF, telefone com DDD e `+55` e endereço do mapa no Brasil.

## 17. Definição de conclusão

Uma tarefa está concluída quando:

- atende a `spec.md`;
- respeita este plano;
- o build é executado com sucesso;
- as validações correspondentes são aprovadas;
- não há erros que impeçam a conclusão;
- sua caixa de seleção é atualizada em `tasks.md`.
