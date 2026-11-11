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

### PropertyCard e grade responsiva — Etapa 8

- Componentes reutilizáveis em `apps/web/src/components/properties/`: `PropertyCard` recebe os campos públicos necessários à apresentação e `PropertyGrid` organiza os cards em uma, duas ou três colunas conforme a largura da tela.
- Integrar a grade às três seleções da landing, preservando a consulta REST compartilhada, os limites e os estados existentes. Expandir o tipo e a validação Zod da landing para imagens, quartos, banheiros e áreas, sem alterar o contrato REST ou o backend.
- Exibir imagem principal ou, na ausência dela, a primeira por posição, sem modificar a coleção recebida. Usar `next/image` para URLs HTTPS de entrega do Cloudinary, com proporção reservada, carregamento sob demanda e texto alternativo. Ausência de imagem, URL incompatível ou falha no carregamento apresenta um espaço reservado com texto em português.
- Compartilhar a formatação de preço em BRL e aluguel mensal entre os cards. Exibir tipo, operação, título, bairro/cidade/UF, quartos e banheiros quando não forem nulos, incluindo zero e concordância no singular. Mostrar área útil em m² com formatação `pt-BR`; quando ausente, mostrar a área total, identificada como tal.
- Validar seleção de imagem, formatação, campos opcionais, contrato REST e renderização dos componentes com testes unitários, além de lint, tipos, build e conferência visual da grade em celular, tablet e computador. Catálogo, filtros e páginas de detalhes permanecem nas respectivas etapas.

### Catálogo — Etapa 9

- Substituir a página provisória de `/properties` pelo catálogo público, com título, introdução e a grade reutilizável de imóveis, exibindo todos os itens retornados pela API na mesma ordem.
- Compartilhar entre a landing e o catálogo o cliente REST com validação Zod, timeout de dez segundos e um hook SWR para `GET /api/properties`. A regra de publicação continua no backend existente; o frontend não acessa o banco.
- Apresentar a quantidade de imóveis disponíveis e estados básicos de carregamento, catálogo vazio e erro com nova tentativa, usando semântica acessível e os estilos existentes.
- Validar o consumo REST, a listagem completa, contagem, estados e responsividade, além de lint, tipos, testes e builds dos dois aplicativos. Busca, filtros, opções de ordenação e detalhes permanecem nas próximas etapas.

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

### Busca textual — Etapa 10

- Receber `search` em `/properties` e em `GET /api/properties`, removendo espaços externos e limitando o termo a 200 caracteres. Ausência ou texto vazio mantém a listagem completa; parâmetros `search` repetidos ou acima do limite retornam `400` na API.
- Consultar título, bairro, cidade, UF e descrição com correspondência parcial sem distinção entre maiúsculas e minúsculas no PostgreSQL, sempre combinada com `isPublished: true`. Acentos são preservados; `%`, `_` e barra invertida são tratados como texto literal. Manter o contrato público e a ordem estável existentes.
- Adicionar formulário de busca ao catálogo, com React Hook Form e Zod, ação GET e navegação pela URL. Preservar os demais parâmetros existentes ao buscar ou limpar o termo. Venda/aluguel e os demais filtros continuam na Etapa 11.
- Usar uma chave SWR por termo normalizado, compartilhando `/api/properties` com a landing quando não houver busca. Não filtrar a lista no navegador nem mostrar resultados de outro termo durante o carregamento.
- Preencher o campo pela URL, incluindo acesso direto, recarga e voltar/avançar. Apresentar o termo pesquisado, contagem e estado específico sem resultados; entradas inválidas permitem corrigir a busca sem consultar a API.
- Validar entrada HTTP, propagação ao repositório, cinco campos no PostgreSQL, publicação, caracteres literais, URLs, cache e interface, além de lint, tipos, testes e builds dos dois apps. Testes de banco usam transações revertidas.

### Filtros combinados — Etapa 11

- Aceitar `operation`, `type`, `minPrice`, `maxPrice`, `bedrooms`, `bathrooms`, `minUsableArea`, `neighborhood`, `city` e `state`, combinados entre si e com `search` por AND no PostgreSQL, sempre com `isPublished: true`. Preservar a ordem estável e o contrato público.
- Operação e tipo usam os enums públicos; UF é normalizada para maiúsculas e validada entre as 27 UFs. Bairro e cidade usam correspondência parcial sem distinção de maiúsculas, preservando acentos e escapando `%`, `_` e barra invertida.
- Preços são limites inclusivos em BRL; área mínima considera somente `usableArea`. Quartos e banheiros usam igualdade para 1/2/3 e mínimo de quatro para `4+`. Campos nulos não correspondem às quantidades selecionadas. A interface identifica essas regras e o valor mensal de aluguel.
- Validar um único valor por parâmetro, exceto `type`, que aceita até seis valores. Campos de localização têm até 200 caracteres; quartos e banheiros aceitam `1`, `2`, `3` e `4+`; limites decimais são não negativos com até duas casas e compatíveis com `Decimal(14,2)` para preço e `Decimal(12,2)` para área. Rejeitar faixa de preço invertida. Vazios são omitidos; erros retornam `400` antes da consulta. Decimais permanecem strings, sem perda por ponto flutuante.
- Formulário GET com React Hook Form e Zod, rótulos e erros acessíveis, em painel lateral responsivo. Preço utiliza barra de duas alças; a API e as URLs geradas usam ponto decimal. Área aceita vírgula ou ponto na interface.
- Aplicar e limpar filtros preserva busca e parâmetros não relacionados; a busca preserva os filtros. Preencher campos pela URL e reiniciar o formulário por chave ao navegar, inclusive voltar/avançar. Chave SWR canônica por busca e combinação normalizada, sem reutilizar outra listagem nem filtrar no navegador.
- Validar filtros individuais e combinados, limites, nulos, rascunhos e caracteres literais em transações revertidas no PostgreSQL; cobrir API, formulários, URLs, cache e proxy com testes. Conferir lint, tipos, builds e interface responsiva. Ordenação permanece na Etapa 12.

### Ajuste solicitado — Painel lateral de filtros

- Posicionar um painel recolhível à esquerda dos cards em telas a partir de 1024 px. Quando recolhido, a grade ocupa a largura disponível. Em telas menores, acomodar o painel como seção recolhível acima dos resultados. Preservar os valores e filtros ativos ao recolher; usar botão com `aria-expanded`, `aria-controls` e conteúdo oculto fora da navegação por teclado.
- Substituir o tipo único por checkboxes. Repetir `type` na URL, validar até seis valores dos enums, eliminar duplicações e ordenar para o cache. No Prisma, usar `type: { in: [...] }`. Tipos usam OR entre si e AND com os demais filtros. Um único `type` continua válido.
- Quartos e banheiros são escolhas únicas `1`, `2`, `3` ou `4+`; ausência representa qualquer quantidade. Consultar igualdade para 1/2/3 e `gte: 4` para `4+`.
- Usar uma barra de duas alças acessíveis, com rótulos, valores BRL, teclado e impedimento de cruzamento. A escala fixa de zero a R$ 10 milhões e seus incrementos seguem o ajuste abaixo. O endpoint `GET /api/properties/price-range?operation=...` continua disponível para consultar os extremos de preços publicados, independentemente da barra.
- Manter busca, localização, banheiros e área, submissão GET, histórico, validações e estado SWR por combinação. Validar os novos contratos e a agregação no backend; conferir seleção múltipla, quartos exatos/4+, barra, teclado e layout expandido/recolhido no navegador.

### Ajuste solicitado — Escala fixa, banheiros e localização

- A barra usa os limites fixos de R$ 0 a R$ 10 milhões em ambas as operações, sem consultar a faixa agregada. Conforme o novo ajuste solicitado, cada posição corresponde a um valor permitido: 50 passos de R$ 100 até R$ 5 mil; mais 10 de R$ 500 até R$ 10 mil; mais 40 de R$ 1.000 até R$ 50 mil; mais 10 de R$ 5.000 até R$ 100 mil; mais 90 de R$ 10.000 até R$ 1 milhão; mais 180 de R$ 50.000 até R$ 10 milhões. Mapear os índices de 0 a 380 para preços e vice-versa, com aritmética inteira, teclado, arraste e bloqueio de cruzamento.
- Usar os campos editáveis de preço no formulário GET, conforme o ajuste abaixo; os índices são exclusivos da apresentação e não seguem na URL nem na API. Valores iniciais válidos na URL mantêm seu preço exato; movimentar uma alça seleciona os passos da escala. Valores fora do intervalo fixo são rejeitados no catálogo com orientação para correção. A API preserva a validação decimal do contrato existente.
- Alterar operação preserva os limites, pois a escala é comum. O endpoint agregado de preços existente continua independente da barra.
- Banheiros passa a aceitar apenas `1`, `2`, `3` e `4+`, ou ausência para qualquer quantidade, assim como quartos. Usar igualdade para 1/2/3 e `gte: 4` para `4+` no PostgreSQL; validar os dois contratos e substituir o campo numérico por opções de escolha única.
- Exibir área útil seguida por Estado (UF), Cidade e Bairro, na mesma ordem do teclado. Validar extremos e transições da escala em ambos os sentidos, URLs em reais, filtros de banheiros, builds e responsividade.

### Ajuste solicitado — Preços digitáveis e sincronizados

- Substituir os valores de mínimo e máximo por dois campos de texto com `inputMode="decimal"`, rótulos em reais e referências do React Hook Form para foco em erros. Os mesmos valores do formulário alimentam a barra, sem estado duplicado ou efeitos de sincronização.
- Aceitar números sem formatação, ponto ou vírgula decimal e formatação brasileira com milhar (`1.234,56`), inclusive colagem com `R$`. Preservar o texto durante a digitação; formatar em `pt-BR` ao sair do campo e ao mover a alça. Validar o intervalo de zero a R$ 10 milhões, duas casas decimais e mínimo menor ou igual ao máximo. Entradas inválidas permanecem disponíveis para correção.
- A digitação preserva valores exatos, sem arredondar aos passos. A posição da alça acompanha o preço informado; mover a barra ou usar suas setas continua selecionando os incrementos já definidos e bloqueando o cruzamento.
- Enviar os valores reais dos campos pelo formulário GET e normalizar para strings decimais sem milhar na URL gerada e na API. Usar apenas um campo com cada nome no formulário, sem duplicar os parâmetros. Remover a legenda de incrementos e manter uma orientação curta sobre digitar ou arrastar.
- Validar formatação, sincronização nas duas direções, precisão, extremos, faixa invertida, URL/histórico, teclado e layout em celular e computador.

### Ordenação e estados — Etapa 12

- Adicionar o tipo público `PublicPropertySort` com `recent`, `price_asc`, `price_desc`, `area_asc` e `area_desc`. Validar `sort` único no catálogo e no Route Handler antes de consultar o serviço; ausência ou vazio usa `recent`. Valores inválidos retornam `400` na API e uma mensagem corrigível no catálogo.
- Propagar a ordenação pelo serviço até `findPublished`, aplicando `orderBy` no Prisma/PostgreSQL junto da busca e dos filtros. Preço usa o decimal do banco; área usa `usableArea`, com `nulls: last` nos dois sentidos. Desempatar por `createdAt desc` e `id asc`; manter a ordem padrão existente.
- Criar seletor acessível com formulário GET, React Hook Form e Zod na barra superior do catálogo, com ação explícita de ordenar e preservação de parâmetros repetidos de tipos, busca e filtros. Preencher pela URL e usar chave para recarga/histórico. Buscar, aplicar ou limpar filtros preserva `sort`.
- Incluir a ordenação na chave SWR canônica; `recent` explícito e implícito compartilham a chave padrão. Não ordenar no navegador nem reutilizar resultados de outra combinação. Permitir corrigir a ordenação sem consultar parâmetros inválidos.
- Acrescentar skeletons decorativos com a mesma grade dos cards, anúncio de carregamento e animação desativada com movimento reduzido. Preservar os estados específicos de vazio, ausência de correspondências e erro com nova tentativa.
- Validar as cinco ordens, desempates, nulos, centavos, publicação e filtros em transações revertidas no PostgreSQL; cobrir Route Handler, URLs, cache, formulário e estados. Executar lint, tipos, testes, builds, HTTP/proxy e conferir teclado e responsividade no navegador.

### Detalhes do imóvel — Etapa 13

- Criar `/properties/[id]` como Server Component, aguardando `params` e consultando somente `GET /api/properties/{id}` na origem `API_URL`. Validar UUID antes da requisição, usar `cache: no-store`, timeout de dez segundos e validação Zod do contrato público completo. Retornar `notFound()` para identificador inválido ou resposta `404`; falhas de rede, HTTP ou contrato usam mensagem genérica e a fronteira de erro da rota.
- Exibir título, operação, tipo, preço BRL com aluguel mensal, descrição com quebras de linha, áreas útil e total, quartos, banheiros, vagas, idade, características e endereço brasileiro com complemento e CEP. Omitir campos opcionais nulos e preservar zero; mostrar ausência de características e descrição com mensagens claras. Exibir datas de cadastro e atualização em `pt-BR`/`America/Sao_Paulo`.
- Reutilizar `PropertyImage` para uma foto principal com tamanho adequado à página, priorizando a imagem principal ou a primeira por posição e mantendo o tratamento de ausência/erro. Galeria com miniaturas e navegação, Google Maps, contato e metadados dinâmicos completos seguem as Etapas 14, 15, 16 e 31.
- Tornar os cards links acessíveis para os detalhes, sem pré-buscar cada página. No catálogo, transportar os parâmetros atuais em `from`; construir o retorno sempre em `/properties`, preservando busca, tipos múltiplos, filtros e ordenação sem permitir URL externa. Cards da landing retornam ao catálogo geral.
- Adicionar `loading.tsx`, `not-found.tsx` e `error.tsx` específicos, com skeletons decorativos, movimento reduzido, navegação ao catálogo e recuperação por `retry()` conforme a API desta versão do Next.js. `notFound()` inclui `noindex`; respostas já transmitidas por streaming podem manter HTTP `200`, conforme a convenção do framework.
- Validar cliente REST, contrato completo, ausência/erro, escape de texto, nulos/zero, BRL, CEP, datas, links e retorno ao catálogo. Executar lint, tipos, testes, build do frontend e HTTP/proxy; conferir acesso pelos cards, acesso direto, recarga, teclado, responsividade e recuperação no navegador. Preservar o backend e os dados existentes.

### Galeria — Etapa 14

- Substituir a foto isolada dos detalhes por `PropertyGallery`, recebendo somente título e imagens do contrato REST já carregado no servidor. Manter a imagem principal primeiro e as demais por posição, sem modificar os dados recebidos; sem principal, começar pela menor posição.
- Exibir a foto selecionada em proporção reservada, miniaturas em grade responsiva, contador e botões anterior/próxima com navegação circular. Oferecer setas esquerda/direita e Home/End quando o foco estiver na galeria, sem rotação automática. Identificar a miniatura selecionada, fornecer rótulos e textos alternativos em pt-BR, anunciar a posição e preservar o foco nos controles.
- Reutilizar `PropertyImage` e `next/image`, com `sizes` próprios para foto e miniaturas; pré-carregar somente a foto inicial e carregar as demais sob demanda. Reservar a apresentação compacta das miniaturas para seus espaços menores. Preservar o tratamento de URL incompatível e falha de carregamento, sem bloquear a navegação.
- Não exibir controles nem miniaturas sem fotos ou com uma única foto. Reiniciar a seleção ao mudar de imóvel e usar a primeira foto disponível quando a seleção deixar de existir. Preservar detalhes, retorno ao catálogo, backend e banco.
- Cobrir ordenação imutável, imagem inicial, estados de zero/uma/várias fotos e acessibilidade com testes; conferir seleção, navegação circular, teclado, foco e falhas com DOM simulado e dados isolados do banco. Conferir a responsividade no navegador quando a automação estiver disponível e registrar eventuais limitações de validação visual. Executar lint, tipos, testes, build do frontend e HTTP/proxy. Mapa, contato e gerenciamento de imagens continuam nas etapas seguintes.

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

### Implementação — Etapa 15

- Integrar `PropertyMap` à seção Localização dos detalhes, preservando o endereço textual completo e a galeria. Usar somente os dados públicos já recebidos por REST; não solicitar coordenadas nem consultar o banco pelo frontend.
- Construir a consulta com logradouro, número, bairro, cidade, UF, CEP no formato brasileiro e Brasil; omitir o complemento. Codificar os valores com `URL`/`URLSearchParams`, mantendo origens fixas do Google. Não alterar o endereço persistido nem inventar coordenadas.
- Utilizar a incorporação pública do Google Maps em `https://maps.google.com/maps`, com `output=embed`, `hl=pt-BR`, `gl=br`, consulta textual e zoom. Este fluxo não usa a Maps Embed API v1 nem exige sua chave. A variável de servidor `GOOGLE_MAPS_ZOOM` em `apps/web` configura o zoom de 0 a 21, com padrão 15 para ausência ou valor inválido. O placeholder privado existente de chave no backend não é utilizado nem enviado ao navegador.
- Renderizar o iframe no servidor, com título acessível, largura responsiva, altura reservada, carregamento sob demanda e política de referência sem envio de dados da página de origem. Identificar a localização como aproximada e manter um link independente para `https://www.google.com/maps/search/?api=1&query=...`, com o mesmo endereço, caso o mapa não carregue. Não inferir sucesso de geocodificação ou carregamento do provedor a partir de eventos do iframe.
- Cobrir montagem e codificação do endereço, CEP com zero inicial, acentos, número `s/n`, exclusão do complemento, configuração, origens fixas, acessibilidade e integração nos detalhes. Validar lint, tipos, testes, build do frontend e HTTP/proxy, além da resposta do provedor para um endereço público. Conferir visualmente quando houver navegador disponível e registrar limitações. Contato e administração seguem suas próprias etapas.

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
