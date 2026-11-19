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

Esses padrões estão definidos em `spec.md`, `plan.md` e `tasks.md`. As Etapas 1 a 16 possuem implementação, incluindo a conexão com PostgreSQL, o fluxo de migrações, os modelos de domínio, o seed de imóveis brasileiros, a API REST pública, a landing page, os cards em grade responsiva, o catálogo, a busca, os filtros, a ordenação, a página de detalhes do imóvel, a galeria de fotos, a localização no Google Maps e o formulário de contato. O envio real de contato depende da configuração do Web3Forms descrita abaixo.

As Etapas 17 e 18 acrescentam cadastro, login, logout, sessões persistidas e autorização USER/ADMIN, com entradas privadas protegidas no servidor. A recuperação de senha solicitada também está implementada; o envio real depende da configuração do Resend.

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

O destino `/properties` exibe o catálogo público; `/login` oferece entrada e controle da sessão, e `/register` permite criar uma conta. Comprar e Alugar direcionam para `/properties?operation=SALE` e `/properties?operation=RENT`, aplicando a operação ao catálogo. O parâmetro `search` pesquisa o catálogo e pode ser combinado com os filtros da Etapa 11. As Etapas 17 a 20 disponibilizam autenticação REST, autorização USER/ADMIN, informações da conta e favoritos.

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

A busca usa React Hook Form e Zod para validar até 200 caracteres e a operação. Ao enviar, navega para `/properties?search=...&operation=...`, removendo espaços externos e codificando acentos e caracteres especiais. Campos vazios são omitidos; sem texto ou operação, abre `/properties`. O formulário também tem ação GET nativa. O destino `/properties` aplica a busca textual e a operação no PostgreSQL.

A Etapa 8 apresenta as três seleções com `PropertyCard` e `PropertyGrid`, reutilizáveis em `apps/web/src/components/properties/`. A grade usa uma coluna no celular, duas a partir de 640 px e três a partir de 1024 px. Cada card mostra operação, tipo, título, preço, bairro/cidade/UF, quartos e banheiros quando aplicáveis. A área útil aparece em m² com separadores brasileiros; na ausência dela, a área total é exibida e identificada. Campos nulos são omitidos e contagens iguais a zero são preservadas.

A imagem principal tem prioridade; sem principal, o card usa a menor posição. Imagens HTTPS do Cloudinary são exibidas com `next/image`, texto alternativo, proporção reservada e carregamento sob demanda. Imóvel sem foto, URL incompatível ou falha de carregamento exibe “Imagem indisponível”. O seed continua sem fotografias; nenhum dado do banco foi alterado. A landing mantém uma única consulta REST compartilhada entre as seleções, e a validação Zod também verifica os novos campos dos cards.

Com o PostgreSQL em execução e o seed carregado, abra a página inicial para visualizar as seleções. Sem banco disponível, a busca e as chamadas para ação continuam acessíveis e as seleções mostram uma mensagem de erro. A ilustração do hero é decorativa; nenhuma fotografia de imóvel foi inventada ou adicionada ao banco.

Execute `npm run home:test` para validar a seleção dos imóveis, os preços, a busca e seus parâmetros, o cliente REST e os estados das seções. `npm run property:test` verifica os cards e a grade, seleção de imagens, campos opcionais, áreas e conteúdo recebido da API. `npm test` verifica ESLint, TypeScript e testes unitários dos apps; `npm run build` valida as duas compilações de produção.

## Catálogo público

A Etapa 9 substitui a página provisória de `/properties` pelo catálogo de imóveis à venda e para alugar. A página exibe todos os imóveis retornados por `GET /api/properties`, mantendo a ordem da API e usando `PropertyCard` e `PropertyGrid`. A regra `isPublished: true` continua no backend; os rascunhos não são enviados ao navegador.

O catálogo informa a quantidade disponível, com singular e plural, e usa uma, duas ou três colunas conforme a largura da tela. Inclui carregamento anunciado, mensagem para catálogo vazio e erro com botão “Tentar novamente”. Os cards mantêm preços em BRL, aluguel mensal, localização brasileira, campos opcionais e o tratamento de imagens da Etapa 8.

O cliente REST em `apps/web/src/lib/api/properties.ts` e o hook `usePublicProperties` são compartilhados com a landing: SWR com a mesma chave `/api/properties` quando não houver busca ou filtros, validação Zod dos campos utilizados, timeout de dez segundos e erro genérico em português. Cada abertura direta do catálogo usa uma consulta REST para a listagem solicitada. Não há acesso ao banco pelo frontend.

### Busca textual

A Etapa 10 permite pesquisar por título, bairro, cidade, UF e descrição. O formulário do catálogo permite alterar e limpar a busca, preservando os demais parâmetros da URL. A busca da landing chega ao mesmo fluxo. Por exemplo, [buscar São Paulo](http://localhost:3000/properties?search=S%C3%A3o+Paulo) preenche o campo ao abrir diretamente ou recarregar; voltar e avançar mantêm a correspondência entre URL, campo e resultados.

`GET /api/properties?search=...` executa a correspondência parcial no PostgreSQL, sem distinguir maiúsculas e minúsculas e mantendo os acentos. O termo é tratado literalmente, inclusive `%`, `_` e barra invertida. Apenas imóveis publicados são retornados, na ordem existente. O termo vazio ou formado por espaços equivale à listagem completa. A API remove espaços externos e retorna `400` para mais de 200 caracteres ou parâmetros `search` repetidos, antes de consultar o banco.

Cada termo normalizado possui uma chave SWR própria; o catálogo não filtra todos os imóveis no navegador nem apresenta dados de outra busca durante o carregamento. O resultado informa o termo e a quantidade encontrada. Sem correspondências, orienta a tentar outras palavras ou limpar a busca; falhas preservam a opção de tentar novamente. URLs inválidas exibem uma orientação e permitem corrigir ou limpar o termo sem consultar a API.

`npm run catalog:test` inclui validação, URLs, cache por termo, formulário GET e resultados da busca. `npm run api:test` verifica entrada HTTP e propagação ao serviço/repositório. `npm run api:test:integration` valida os cinco campos, publicação e caracteres literais no PostgreSQL com transações revertidas. `npm run test:smoke` verifica a busca e os erros pelo proxy entre os apps.

Para conferir a implementação, inicie os dois apps com o PostgreSQL existente em execução e abra [http://localhost:3000/properties](http://localhost:3000/properties). Execute `npm run catalog:test` para os testes de listagem completa, ordem, contagem, estados, integração com o cache SWR e composição da página. Esses testes também fazem parte de `npm test`; `npm run test:smoke` inclui a resposta HTTP da rota do catálogo.

### Filtros combinados

A Etapa 11 permite combinar venda/aluguel, tipos de imóvel, preço mínimo e máximo em BRL, quartos, banheiros, área útil mínima em m², bairro, cidade e UF. Os links Comprar e Alugar e a operação selecionada na landing já filtram os resultados. Exemplo: [casas à venda em São Paulo](http://localhost:3000/properties?operation=SALE&type=HOUSE&city=S%C3%A3o+Paulo&state=SP&bedrooms=3).

O formulário utiliza GET, React Hook Form e Zod. O painel fica à esquerda dos cards a partir de 1024 px e pode ser recolhido ou expandido. Recolher preserva as seleções e os resultados, liberando a largura para a grade; no celular e tablet, o painel se acomoda acima dos cards. A URL preenche os campos e mantém os resultados ao abrir diretamente, recarregar ou navegar no histórico. Aplicar e limpar filtros preserva a busca; buscar ou limpar o termo preserva os filtros.

`GET /api/properties` recebe `operation`, `type`, `minPrice`, `maxPrice`, `bedrooms`, `bathrooms`, `minUsableArea`, `neighborhood`, `city` e `state`. Os filtros e `search` são combinados no PostgreSQL, sempre limitados aos publicados. Bairro e cidade usam correspondência parcial sem distinguir maiúsculas, preservando acentos e caracteres literais; UF é validada e normalizada para maiúsculas. A ordem padrão por data e ID permanece.

Tipo de imóvel usa checkboxes com seleção múltipla: `type=HOUSE&type=APARTMENT` retorna casas ou apartamentos, combinados aos demais filtros. Até seis valores são aceitos; duplicações são eliminadas e a ordem é normalizada no cache. Quartos e banheiros oferecem qualquer quantidade, 1, 2, 3 e 4 ou mais. Os valores `bedrooms=1`, `2` e `3` são exatos; `bedrooms=4%2B` significa pelo menos quatro. `bathrooms` segue as mesmas regras, inclusive `bathrooms=4%2B`; zero e valores fora dessas opções retornam `400`. Campos nulos não correspondem a quantidades selecionadas. A área mínima usa somente a área útil; em seguida, os campos aparecem na ordem Estado (UF), Cidade e Bairro.

A faixa de preço usa uma barra com duas alças e campos de **mínimo e máximo digitáveis**, sincronizados nos dois sentidos, com limites de **R$ 0 a R$ 10.000.000**. A digitação aceita valores sem formatação, ponto ou vírgula decimal e valores brasileiros como `1.234,56`, inclusive colagem com `R$`; ao sair do campo, o valor é formatado em `pt-BR`. Os centavos digitados são preservados, sem arredondamento aos passos. A faixa invertida, preços negativos, acima de R$ 10 milhões ou inválidos impedem o envio e permitem corrigir os campos.

O arraste e as setas da barra usam seis faixas: **R$ 100 até R$ 5.000**, **R$ 500 acima de R$ 5.000 até R$ 10.000**, **R$ 1.000 acima de R$ 10.000 até R$ 50.000**, **R$ 5.000 acima de R$ 50.000 até R$ 100.000**, **R$ 10.000 acima de R$ 100.000 até R$ 1.000.000** e **R$ 50.000 acima de R$ 1.000.000**, preenchendo os campos automaticamente e impedindo o cruzamento. Os campos aceitam qualquer valor válido dentro dos limites, inclusive centavos e valores entre os passos; a barra acompanha a posição mais próxima sem alterar o preço digitado. A interface não exibe a legenda de incrementos. Os preços são preservados ao trocar operação; para aluguel, o valor é mensal. A barra fica disponível imediatamente. Índices internos representam seus passos; o formulário GET usa os campos editáveis e a URL gerada e a API recebem os preços reais normalizados, com duas casas decimais.

O endpoint independente `GET /api/properties/price-range` continua retornando `{ minPrice, maxPrice }` dos publicados, opcionalmente por `operation=SALE` ou `RENT`, sem carregar o catálogo. A barra fixa não utiliza essa consulta.

Preços e área são limites inclusivos. A API e as URLs geradas usam ponto e até duas casas (`minPrice=2500.00`). A API mantém a precisão do domínio, com preços até `999999999999.99` e área até `9999999999.99`; o catálogo oferece a escala de preço de zero a R$ 10 milhões. Valores vazios são ignorados. Enums inválidos, UF inválida, negativos, limites excedidos, parâmetros únicos repetidos e preço mínimo maior que o máximo retornam `400` antes de consultar o banco. `type` é o parâmetro que permite múltiplos valores.

O cache SWR possui uma chave canônica por combinação normalizada, mantendo o compartilhamento com a landing no catálogo sem busca ou filtros e com a ordenação padrão. Resultados de outra combinação não são exibidos durante o carregamento. Sem correspondências, a interface orienta a ajustar ou limpar os filtros. `npm test`, `npm run api:test:integration` e `npm run test:smoke` cobrem validação, combinações, precisão decimal, nulos, publicação, URLs e proxy.

### Ordenação e estados

A Etapa 12 acrescenta o seletor **Ordenar por**, com botão **Ordenar**, acima do catálogo. O formulário GET preserva busca e filtros, incluindo múltiplos tipos, e sua seleção acompanha acesso direto, recarga e histórico. Buscar, aplicar ou limpar filtros também preserva a ordenação.

O parâmetro `sort` é aceito em `/properties` e `GET /api/properties`:

| Valor | Ordenação |
| --- | --- |
| `recent` | Mais recentes (padrão) |
| `price_asc` | Menor preço |
| `price_desc` | Maior preço |
| `area_asc` | Menor área útil |
| `area_desc` | Maior área útil |

A ordenação é executada no PostgreSQL junto dos filtros, usando os valores decimais. Imóveis sem área útil aparecem ao final nas duas ordens de área. Empates usam data de criação decrescente e ID crescente. `sort` ausente ou vazio usa `recent`; valores inválidos ou repetidos retornam `400` na API e permitem corrigir a seleção no catálogo. Cada ordenação tem uma chave SWR própria, e `recent` explícito compartilha o cache padrão.

O carregamento anuncia “Carregando imóveis…” e exibe seis skeletons na grade responsiva, ocultos da árvore de acessibilidade e sem animação quando há preferência por movimento reduzido. Imóveis de outra combinação não aparecem enquanto os novos dados carregam. Catálogo vazio, busca/filtros sem correspondências e erro com **Tentar novamente** mantêm mensagens específicas e preservam a seleção.

### Detalhes do imóvel

A Etapa 13 disponibiliza `/properties/{id}`, acessível pelos cards da landing e do catálogo. A página é renderizada no servidor e consulta exclusivamente `GET /api/properties/{id}` na origem definida em `API_URL`, sem acesso ao banco pelo frontend. O cliente valida o contrato completo com Zod, usa timeout de dez segundos e não mantém cache das respostas. UUIDs inválidos não disparam requisições; imóveis ausentes usam a página de indisponibilidade e falhas temporárias oferecem **Tentar novamente**.

Os detalhes exibem título, operação, tipo, preço BRL com `/mês` para aluguel, foto principal, descrição, áreas útil e total, quartos, banheiros, vagas, idade, características, endereço com complemento e CEP brasileiro e datas no fuso `America/Sao_Paulo`. Campos opcionais nulos são omitidos e zeros válidos são preservados. A imagem usa o tratamento de ausência/erro existente e um tamanho adequado à página. Descrição e características ausentes recebem mensagens específicas.

Cards do catálogo transportam os parâmetros em `from`; **Voltar aos imóveis** preserva busca, filtros, tipos múltiplos e ordenação. O retorno é sempre um caminho local de `/properties`. Cards da landing retornam ao catálogo geral. Os links não pré-buscam cada página de detalhes.

A rota inclui carregamento com skeletons acessíveis, página de imóvel não encontrado e fronteira de erro com recuperação por `retry()`. A ausência inclui `noindex`; quando o carregamento já iniciou streaming, o Next.js pode manter HTTP `200` ao exibir a página de ausência. A API continua respondendo `404` para imóveis inexistentes ou despublicados. `npm run property-detail:test` cobre cliente REST, renderização, erros, formatação, segurança de texto, navegação, galeria e mapa; esses testes integram `npm test`. Contato e metadados dinâmicos completos seguem suas etapas.

### Galeria de fotos

A Etapa 14 substitui a foto isolada por `PropertyGallery`, usando o título e as imagens já recebidos pela API REST. A principal aparece primeiro; as demais seguem a posição cadastrada. Sem principal, a foto de menor posição abre a galeria. A coleção recebida não é alterada e nenhuma requisição adicional de imóveis é feita ao navegar pelas fotos.

As miniaturas ficam em uma grade que se adapta à tela, com indicação da foto selecionada. **Foto anterior** e **Próxima foto** permitem navegação circular; com o foco na galeria, as setas esquerda/direita também navegam, **Home** abre a primeira e **End** a última. O contador é anunciado por leitores de tela e os controles preservam o foco. Não há reprodução automática.

Imóveis sem foto mostram **Imagem indisponível**; com uma única foto, exibem somente a foto e o contador. Esses dois casos não têm controles nem miniaturas redundantes. URLs incompatíveis e falhas de carregamento mantêm o espaço reservado sem bloquear a escolha de outra foto. A apresentação usa `next/image`, proporção reservada, texto alternativo, pré-carregamento da foto inicial e miniaturas sob demanda.

`npm run property-detail:test` também executa os testes de galeria e as interações em DOM simulado com jsdom, incluindo seleção, volta circular, teclado, foco, remoção de fotos, troca de imóvel e falhas de imagem. A configuração de teste resolve o default CommonJS de `next/image` e fornece a configuração real de imagens do app, preservando o componente do Next nos testes. O seed existente continua sem fotografias; a administração e o envio de imagens para o Cloudinary seguem a etapa correspondente.

### Google Maps

A Etapa 15 acrescenta o Google Maps à seção **Localização** dos detalhes. O endereço textual, incluindo o complemento quando informado, permanece disponível. O mapa usa logradouro, número, bairro, cidade, UF, CEP formatado e Brasil, sem exigir latitude ou longitude. O complemento não é enviado ao mapa.

`PropertyMap` renderiza um iframe no servidor com título acessível, largura responsiva, altura reservada, carregamento sob demanda e indicação de localização aproximada. A incorporação pública usa `https://maps.google.com/maps?output=embed`, com `hl=pt-BR` e `gl=br`, sem SDK ou chave da Maps Embed API v1. O placeholder privado `GOOGLE_MAPS_API_KEY` do backend não é utilizado nem exposto neste fluxo.

O zoom é configurado em `apps/web/.env.local`, sem prefixo `NEXT_PUBLIC_`:

```dotenv
GOOGLE_MAPS_ZOOM="15"
```

São aceitos inteiros de 0 a 21; ausência ou valor inválido utiliza 15. Reinicie o frontend após alterar. As URLs são montadas com origem fixa e codificação dos dados por `URLSearchParams`, preservando acentos, número `s/n` e CEP com zero inicial. A apresentação não confirma a precisão da geocodificação feita pelo Google.

O link **Abrir no Google Maps** permanece disponível fora do iframe e utiliza a [URL pública de pesquisa documentada pelo Google](https://developers.google.com/maps/documentation/urls/get-started), com o mesmo endereço. Assim, o visitante pode consultar a localização quando a incorporação não carregar. O link abre em nova aba, identificado para leitores de tela; a política do iframe não envia dados da página de origem no cabeçalho de referência.

`npm run property-detail:test` cobre a montagem do endereço, codificação, zoom, origens das URLs, ausência de chave, renderização e acessibilidade. `npm run test:smoke` confere o mapa nos detalhes de venda, aluguel e terreno servidos por REST. O banco, os contratos públicos e os cadastros existentes não são alterados.

### Contato com Web3Forms

A Etapa 16 acrescenta **Tenho interesse** aos detalhes de cada imóvel, com nome, e-mail, telefone com DDD e mensagem. Os campos têm rótulos, validação por React Hook Form e Zod, foco no primeiro erro e mensagens acessíveis. Durante o envio os campos ficam desabilitados; o sucesso limpa o formulário, e falhas preservam os dados. Não há repetição automática do envio.

O navegador envia JSON para `POST /api/inquiries` pelo proxy REST, acrescentando um `requestId` UUID de tentativa. O backend valida o mesmo contrato público, limita o corpo a 20 KB e consulta o imóvel publicado para obter seu ID e título canônicos. Rejeita campos extras, contatos inválidos, DDD inexistente e o campo antispam preenchido. Nome aceita 2–100 caracteres; e-mail, até 254; mensagem, 10–3000. O contato exige celular com DDD válido e onze dígitos nacionais. A máscara `(xx) xxxxx-xxxx` acompanha a digitação, limita os dígitos excedentes e aceita colagem com `+55`; o backend valida o celular completo e normaliza para o formato internacional. Os campos obrigatórios têm asterisco e placeholders de exemplo. Nenhum contato ou chave é registrado em logs.

Configure somente em `apps/api/.env.local` e reinicie o backend:

```dotenv
WEB3FORMS_ACCESS_KEY=""
```

Preencha com uma access key real do formulário. **O fluxo funciona com o plano gratuito:** o backend devolve os dados preparados e o navegador envia diretamente ao Web3Forms, conforme a [orientação oficial](https://docs.web3forms.com/getting-started/troubleshooting). O provedor permite que essa access key seja pública. A variável fica centralizada no backend e é entregue na resposta de preparação, sem expor senhas do banco, segredos de autenticação ou credenciais do Cloudinary. O arquivo de exemplo continua sem valores reais.

Sem chave válida, o endpoint responde `503` antes de salvar, e o formulário informa indisponibilidade. Imóvel ausente ou despublicado retorna `404`; JSON/dados inválidos, `400`; formato de conteúdo incorreto, `415`; corpo acima do limite, `413`. Falhas internas retornam `500` com mensagem genérica. A resposta `201` confirma a persistência e contém `inquiry: { id, createdAt }`, `provider` e `payload`, sem indicar envio de e-mail concluído. O endpoint antigo `/api/contact` continua disponível somente para preparação compatível, sem persistência; o formulário usa exclusivamente `/api/inquiries`.

O cliente valida o contrato de preparação e confirma que o ID corresponde ao imóvel solicitado. Em seguida, faz POST JSON diretamente a `https://api.web3forms.com/submit`, com os dados canônicos, telefone normalizado, access key pública e antispam. Ambas as requisições têm timeout de quinze segundos. Somente a resposta HTTP de sucesso **e** `success: true` do Web3Forms confirmam o envio; falhas de rede, rejeição ou resposta inválida mantêm os campos e mostram erro, sem repetição automática.

Não faça proxy do envio ao Web3Forms: chamadas pelo servidor exigem plano pago e IP liberado pelo provedor e podem receber um bloqueio `403` do Cloudflare. O fluxo gratuito utiliza o navegador e sua validação HTTPS normal, sem falsificar cabeçalhos ou desativar a verificação de certificados.

Na Etapa 21, a consulta é persistida **antes** de enviar ao Web3Forms. Visitantes têm `userId` nulo; contas USER/ADMIN são identificadas exclusivamente pela sessão válida e ativa. E-mail de contato não define identidade. Sessão apresentada e inválida retorna `401`, sem registrar silenciosamente como visitante. Escritas verificam origem com `AUTH_TRUSTED_ORIGINS`, e todas as respostas usam `no-store` e `Vary: Cookie`.

O `requestId` é usado como chave primária de `Inquiry`, sem migração. Repetir a mesma tentativa, contato normalizado e conta preserva registro e data; outros dados com o mesmo UUID retornam `409`. Um bloqueio transacional também impede duplicações concorrentes. Novas consultas são limitadas a dez por e-mail em quinze minutos, com chave SHA-256 e escopo próprio em `AuthRateLimit`; excesso retorna `429` e `Retry-After: 900`. Repetições já salvas não consomem novas tentativas. A limpeza periódica dos contadores de autenticação também atende a esses registros.

Se o Web3Forms falhar ou a resposta se perder, a consulta permanece salva e o formulário informa que o envio por e-mail não foi confirmado. Os campos e o UUID são mantidos em memória para uma nova tentativa manual, sem novo registro. Não há repetição automática. O provedor pode ter enviado mesmo sem confirmação: a idempotência do portal não garante e-mail único. Alterar dados inicia outra consulta; recarregar a página perde a tentativa em memória. O histórico da conta confirma o registro no portal, sem atestar entrega de e-mail.

`npm run api:test` cobre contrato, telefone, preparação e persistência coordenada; `npm run api:test:integration` verifica PostgreSQL, isolamento, limite e concorrência. `npm run property-detail:test` inclui REST → Web3Forms e falhas parciais em DOM simulado; `npm run auth:test:web` cobre o histórico da conta. Com os dois apps iniciados, `npm run inquiries:test:http` valida persistência e sessão diretamente e pelo proxy, removendo seus dados ao terminar. Os testes usam respostas simuladas para o provedor e não enviam e-mails reais. Depois de configurar o provedor, confira manualmente o recebimento de uma solicitação pelo formulário.

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

No backend `apps/api`, as rotas em `src/app/api/properties/` chamam o serviço em `src/services/public-property-service.ts`, que serializa os dados. O repositório em `src/repositories/public-property-repository.ts` consulta o Prisma com `isPublished: true` tanto na listagem quanto nos detalhes. A conexão é aberta somente quando uma consulta é executada. A listagem aplica busca, filtros e ordenação no PostgreSQL, sempre com desempates estáveis por data de criação e ID.

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

## Autenticação REST — Etapa 17

### Contas locais para teste

Execute `npm run db:seed:users` na raiz para criar estas contas fictícias no PostgreSQL:

| Perfil/estado | E-mail | Senha inicial | Teste atual |
| --- | --- | --- | --- |
| USER ativo | `usuario@exemplo.test` | `Usuario2026!` | Login, sessão, recarga e logout de usuário comum. |
| ADMIN ativo | `admin@exemplo.test` | `Admin2026!` | Login com perfil ADMIN retornado pelo backend. |
| USER inativo | `inativo@exemplo.test` | `Inativo2026!` | Login deve ser recusado com o erro genérico de credenciais. |

São credenciais públicas de demonstração para ambiente local. O comando recusa `NODE_ENV=production`, cria em uma transação e armazena somente os hashes scrypt. Reexecutar preserva nome, e-mail, senha, perfil e estado das contas existentes; conflito de e-mail com outra conta cancela a criação sem alterá-la. Esse seed é independente do seed de imóveis e não cria sessões.

Para aplicar novamente as senhas da tabela às contas de demonstração existentes, execute `npm run db:seed:users -- --reset-passwords`. A opção exige ID/e-mail esperados, modifica somente as senhas dessas três contas e revoga suas sessões; nomes, perfis, atividade e demais usuários são preservados. A atualização para as senhas acima foi solicitada junto à nova política de cadastro.

Acesse [Entrar](http://localhost:3000/login) para testar. USER e ADMIN acessam a entrada privada de `/account`; somente ADMIN acessa `/admin`. A conta inativa permanece bloqueada. Informações da conta, favoritos e funções administrativas seguem suas próprias etapas.

### Recuperar senha

No login, **Esqueci minha senha** abre `/forgot-password`. A solicitação aceita retorna uma mensagem condicional igual para contas ativas, inativas ou inexistentes. Somente contas ativas recebem o link. O link abre `/reset-password#token=...`, vale por 30 minutos e funciona uma única vez; pedir outro invalida o anterior. A nova senha segue os critérios do cadastro e exige confirmação. Após redefinir, todas as sessões da conta são revogadas e é necessário entrar novamente.

Configure em `apps/api/.env.local` e reinicie o backend:

```dotenv
WEB_URL="http://localhost:3000"
RESEND_API_KEY="sua-chave-privada-do-resend"
AUTH_EMAIL_FROM="acesso@seu-dominio.com.br"
```

`AUTH_EMAIL_FROM` deve ser um endereço de remetente verificado no [Resend](https://resend.com/docs/api-reference/emails/send-email), sem nome ou colchetes. Em produção, `WEB_URL` deve ser a origem HTTPS pública do frontend, sem caminho/query/fragmento; configure também `AUTH_TRUSTED_ORIGINS`. Desative rastreamento de cliques nesses e-mails para preservar o link com fragmento. Nenhum desses valores usa o prefixo `NEXT_PUBLIC_`. A chave do Web3Forms continua exclusiva do contato e não envia recuperação de senha.

Sem configuração válida, a API retorna `503` e a tela informa indisponibilidade. O aceite `202` confirma a solicitação, não a entrega: o envio ocorre após a resposta para não revelar a existência de uma conta pela latência ou falha do provedor. Falhas geram aviso genérico no backend e invalidam apenas o token correspondente, sem registrar e-mail, token ou credenciais e sem repetição automática. O usuário pode solicitar novamente. Os testes usam envio simulado; entrega real depende da configuração do Resend.

| Requisição | Entrada JSON | Resultado |
| --- | --- | --- |
| `POST /api/auth/forgot-password` | `email` | `202`, mensagem condicional uniforme. |
| `POST /api/auth/reset-password` | `token`, `password`, `confirmPassword` | `200`, senha atualizada e cookie expirado; link inválido/expirado/usado retorna `400`. |

A migração aditiva `20261115020000_criar_recuperacao_senha` cria `PasswordReset`. Somente hashes SHA-256 dos tokens são persistidos; consumo, troca da senha e revogação das sessões são transacionais, com bloqueio por usuário para impedir consumo simultâneo. O fragmento não é enviado no acesso HTTP à página; não há token em respostas REST ou localStorage. As rotas reutilizam limite de JSON, proteção de origem e limite persistente de dez tentativas por identificador/operação a cada quinze minutos.

### Fluxo e configuração

As páginas `/login` e `/register` usam React Hook Form + Zod com validação acessível, estados de envio e tratamento de falhas. Ao confirmar o acesso, a senha é limpa e o painel apresenta a sessão atual, a opção Sair da conta e links à conta e ao catálogo. ADMIN também recebe o link Administração. O cabeçalho muda Entrar para Minha conta. Navegação e painel compartilham uma consulta `/me` por SWR, com revalidação ao recuperar o foco; credenciais não são armazenadas em localStorage/sessionStorage.

### Autorização USER e ADMIN — Etapa 18

| Recurso | Visitante/sessão inválida | USER ativo | ADMIN ativo |
| --- | --- | --- | --- |
| `GET /api/auth/me` | `401` | `200` | `200` |
| `GET /api/admin/session` | `401` | `403` | `200` |
| `/account` | Redireciona ao login | Acesso permitido | Acesso permitido |
| `/admin` | Redireciona ao login | Redireciona a `/access-denied` | Acesso permitido |

A conta `/account` exibe as informações descritas na Etapa 19 abaixo; `/admin` continua como entrada mínima protegida até a etapa do painel. O login preserva a intenção de acesso por `next=/account` ou `next=/admin`, oferecendo o link apropriado após entrar. Outros destinos e parâmetros repetidos usam `/account`, sem redirecionamentos externos. USER que pediu administração recebe orientação sobre a restrição. A saída permanece em Gerenciar sessão → Sair da conta.

O serviço `authorizationService.requireUser(token, requiredRole)` consulta a sessão e o perfil atual via `authService.me`; ADMIN herda os acessos USER. Toda nova API privada deve usar `withAuthorization(request, "USER" | "ADMIN", callback)` e realizar acesso aos dados somente dentro do callback autorizado. O guard impede execução sem permissão, protege a origem nas escritas e força `Cache-Control: no-store`/`Vary: Cookie` em sucesso e erro. `401` expira o cookie; `403` preserva a sessão válida. Perfil/identidade em cabeçalhos, parâmetros ou corpo não concedem acesso.

Cada nova página privada deve chamar `requirePageUser("USER" | "ADMIN")` antes de renderizar conteúdo ou carregar dados privados. A verificação ocorre no servidor por REST em `API_URL`, com timeout, sem cache e sem seguir redirecionamentos; somente cookies de sessão são encaminhados. Nenhum acesso direto ao banco existe no frontend. Layout, menu e cache SWR não são controles de autorização. Erros de rede/contrato bloqueiam a área e oferecem nova tentativa. Links privados têm prefetch desativado e páginas usam `noindex, nofollow`. O redirecionamento pode ocorrer por metatag após o início do streaming do Next.js, sem renderizar o conteúdo protegido.

`npm run api:test` cobre hierarquia, falsificação de identidade, guards e erros; `npm run auth:test:web` cobre navegação por perfil, formulários e cliente REST da proteção. `npm run api:test:integration` verifica mudanças de perfil, inatividade, expiração e revogação no PostgreSQL com rollback. Com os dois apps iniciados, `npm run auth:test:http` também testa as permissões diretamente e pelo proxy, páginas privadas, retorno ao login e alterações durante a sessão. Contas descartáveis são removidas em `finally`, sem editar as contas existentes. A Etapa 18 reutiliza os perfis e as tabelas existentes, sem migrações.

### Conta do usuário — Etapa 19

`/account` apresenta nome, e-mail e perfil de acesso (Usuário ou Administrador) da sessão atual. Os dados são renderizados no servidor a partir da mesma consulta REST sem cache que autoriza a página, sem nova API ou alteração no banco. A página mantém `noindex, nofollow`, redirecionamento ao login e tratamento de falhas de acesso.

Imóveis de interesse apresenta os favoritos da Etapa 20. Consultas enviadas apresenta o histórico real da Etapa 21 por `GET /api/inquiries?page=...`, privado USER/ADMIN: dez registros por página, ordem por data/ID, mensagem, data em pt-BR no fuso `America/Sao_Paulo` e link para imóvel publicado. Imóveis despublicados aparecem como indisponíveis, sem revelar o título atual. Contagem e página usam leitura consistente; somente a conta atual é consultada. A URL usa `inquiriesPage` e preserva os parâmetros dos favoritos. Há carregamento, vazio, falha e nova tentativa, com cache separado por usuário e ocultação de dados ao sair/trocar sessão. Consultas feitas como visitante não são associadas posteriormente pelo e-mail.

A navegação permite explorar imóveis e gerenciar a sessão; ADMIN também recebe o atalho Administração. O layout adapta os dados e as seções ao celular, tablet e computador, com quebra de nomes e e-mails longos.

### Favoritos — Etapa 20

USER e ADMIN podem salvar e remover imóveis nos cards da landing, no catálogo e nos detalhes. Os botões são independentes dos links dos cards, informam progresso e confirmam somente a resposta real. Visitantes recebem um link para entrar. Minha conta → Imóveis de interesse mostra a grade de salvos, com contagem, carregamento, vazio, erro e nova tentativa. Imóveis despublicados deixam de aparecer; seu vínculo ainda pode ser removido pela API.

`GET /api/favorites` retorna `{ items, total, page, pageSize, totalPages }`, com até **nove imóveis por página**, somente publicados e pertencentes à conta atual. Aceita `page`, `search` (até 200 caracteres), `operation=SALE|RENT`, `type` e `sort=saved_desc|saved_asc|price_asc|price_desc`. O padrão é salvamento recente, com desempate por ID. Filtros e ordenação são aplicados no PostgreSQL antes de contar e paginar; contagem e página compartilham a mesma transação. Página além do fim retorna a última disponível; coleção vazia retorna página 1 e zero páginas. Parâmetros inválidos ou repetidos retornam `400`.

Minha conta oferece busca por texto, operação, tipo e ordenação, intervalo/total e paginação acessível. A URL usa `favoritesPage`, `favoritesSearch`, `favoritesOperation`, `favoritesType` e `favoritesSort`, preservados na recarga e no histórico. Aplicar/limpar filtros volta à primeira página. Remover preenche novamente a página e ajusta a URL se a última deixar de existir; ausência de resultados do filtro tem mensagem própria.

`GET /api/favorites/ids` fornece somente os IDs publicados salvos, para os botões da landing/catálogo/detalhes indicarem o estado correto mesmo fora da página de favoritos atual. A grade carrega apenas a página solicitada. `POST /api/favorites/{propertyId}` retorna `200` ao salvar ou repetir; `DELETE /api/favorites/{propertyId}` retorna `204` mesmo após remoção anterior. UUID inválido retorna `400`, imóvel inexistente/despublicado na inclusão retorna `404` e sessão inválida retorna `401`. Todos os endpoints exigem sessão USER/ADMIN atual; escritas verificam origem. A identidade vem da sessão, e as respostas usam `no-store` e `Vary: Cookie`.

A chave única existente no PostgreSQL impede duplicações, inclusive em inclusão concorrente; nenhuma migração é necessária. SWR separa os IDs das páginas, com chaves por conta/consulta, e os botões compartilham o bloqueio por imóvel. Após uma escrita confirmada, somente as páginas da mesma conta são revalidadas; falha de recarga oferece nova tentativa sem informar falsamente que a escrita falhou. Logout, expiração e troca de conta ocultam os favoritos anteriores; uma resposta pendente atualiza somente a conta que iniciou a operação. Nenhum favorito ou token é persistido no armazenamento do navegador.

`npm run favorites:test` cobre cliente e interações da interface. `npm run api:test` inclui serviços e rotas; `npm run api:test:integration` inclui isolamento, publicação, idempotência e concorrência no PostgreSQL. Os arquivos dessa suíte executam em sequência para evitar timeouts de conexão local; os cenários de concorrência continuam simultâneos dentro dos testes. Com os apps iniciados, `npm run favorites:test:http` valida a API direta e pelo proxy, removendo suas contas descartáveis.

`npm run auth:test:web` inclui os testes da conta em `apps/web/scripts/account.test.tsx`: dados e semântica, navegação por perfil, disponibilidade das seções futuras e escape de texto. `npm run auth:test:http` confere os dados reais de USER/ADMIN, isolamento entre sessões, recarga, ausência de cache e bloqueio de sessões inativas/expiradas, removendo as contas descartáveis ao terminar.

### Editar perfil e segurança da conta

Na própria `/account`, Editar perfil permite salvar o nome sem informar senha. A seção Alterar e-mail tem ação própria e exige a senha atual; o endereço antigo permanece como login até a confirmação do novo pelo link recebido, válido por 30 minutos. Um pedido novo substitui o anterior. O perfil USER/ADMIN e o estado ativo não são editáveis nessa interface nem aceitos nos contratos REST.

Alterar senha é opcional: os três campos vazios mantêm o hash e as sessões existentes. Preencher qualquer campo exige senha atual, nova senha e confirmação igual, com os mesmos critérios do cadastro. Sucesso limpa e oculta os campos, renova o cookie da sessão atual e encerra as sessões dos outros dispositivos. Salvar apenas o nome não altera a senha. Os formulários têm validação acessível, mostrar/ocultar independente, feedback de envio, bloqueio de duplicação e preservação dos valores em falhas.

| Recurso privado | Entrada JSON | Resultado |
| --- | --- | --- |
| `PATCH /api/account/profile` | `name` | `200`, usuário atualizado. |
| `POST /api/account/password` | `currentPassword`, `newPassword`, `confirmPassword` | `200`, usuário e `changed`; cookie renovado somente quando houver troca. |
| `POST /api/account/email-change` | `email`, `currentPassword` | `202` após aceitação do e-mail pelo provedor; endereço atual preservado. |
| `POST /api/account/email-change/confirm` | `token` | `200`, usuário com novo e-mail e cookie renovado. |

As APIs usam sessão atual, proteção de origem, JSON limitado a 8 KB reais e respostas `no-store`/`Vary: Cookie`. Somente o usuário da sessão pode alterar seus dados. Operações sensíveis compartilham o limite de dez tentativas por usuário em quinze minutos (`429`/`Retry-After`). Senha atual incorreta e dados inválidos retornam `400`, sessão inválida `401`, conflito de e-mail/alteração concorrente `409` e serviço de envio indisponível `503`.

A migração aditiva `20261118010000_criar_alteracao_email` cria `EmailChange`, com um pedido por usuário, hash do token aleatório e expiração. O link `/confirm-email#token=...` exige confirmação explícita, com sessão da conta que fez o pedido; abrir a página não altera dados. Se não estiver conectado, entre e reabra o link. Tokens não são gravados no armazenamento local e saem do histórico após o sucesso. A página usa `noindex, nofollow` e `no-referrer`.

O envio utiliza as mesmas configurações Resend da recuperação: `RESEND_API_KEY`, `AUTH_EMAIL_FROM` (remetente verificado) e `WEB_URL` (origem HTTPS em produção) em `apps/api/.env.local`. Sem configuração, solicitar a mudança retorna `503` e mantém o e-mail atual; não são criadas configurações fictícias. Falha de envio invalida apenas o pedido correspondente. A validação automatizada simula o provedor e não envia e-mails reais; a entrega real depende dessas configurações.

Trocar/recuperar a senha invalida pedidos de e-mail pendentes. Confirmar um e-mail invalida recuperações antigas e outras sessões. As alterações são transacionais, bloqueiam usuário/sessão e revalidam credenciais antes de gravar; o login também revalida o e-mail para impedir sessões criadas por credenciais antigas durante uma mudança. `/api/auth/me` e a página são atualizados após salvar.

`npm run api:test`, `npm run api:test:integration`, `npm run auth:test:web` e `npm run auth:test:http` incluem os testes dessa funcionalidade: troca vazia/parcial, identidade, origem, reautenticação, tokens, falhas do provedor, concorrência, sessões, interação e HTTP direto/proxy. Os testes HTTP são sequenciais para respeitar o limite de hashing por instância; usam contas descartáveis e não enviam mensagens reais.

No cadastro, os quatro critérios de senha acompanham a digitação: 8–15 caracteres, pelo menos uma maiúscula, um número e um caractere especial. O último item mostra “Pelo menos um caractere especial, ex.: @, !, #”; são aceitos pontuação e símbolos Unicode, enquanto espaços não contam como especiais. Cada item usa texto e ícone, com cor de confirmação quando atendido; critérios pendentes começam neutros. Minúsculas não são obrigatórias e sequências são aceitas. O campo Confirmar senha informa a igualdade e acompanha mudanças nos dois campos. Colagens não são truncadas para quinze caracteres: a interface informa o excesso e impede o cadastro. Erros obrigatórios aparecem ao tentar enviar, com foco no primeiro campo inválido. Ambas as senhas são limpas após sucesso.

Senha do login, senha do cadastro e confirmação possuem botões de olho para mostrar/ocultar o conteúdo, independentes entre si. Os campos começam ocultos, mantêm o valor ao alternar e têm controles acessíveis pelo teclado, com rótulo e indicação do estado. Os botões não enviam o formulário, ficam desabilitados durante a requisição e os campos voltam a ficar ocultos após autenticação confirmada.

Os endpoints estão disponíveis diretamente no backend e pelo proxy `/api/**` do frontend:

| Requisição | Entrada JSON | Sucesso |
| --- | --- | --- |
| `POST /api/auth/register` | `name`, `email`, `password`, `confirmPassword` | `201`, `{ user: { id, name, email, role } }` e cookie de sessão. |
| `POST /api/auth/login` | `email`, `password` | `200`, mesmo contrato e novo cookie. |
| `POST /api/auth/logout` | Sem corpo | `204`, revoga a sessão apresentada e expira o cookie. |
| `GET /api/auth/me` | Cookie de sessão | `200` com o usuário atual; `401` se ausente, inválida, expirada ou conta inativa. |

O nome aceita 2–100 caracteres; o e-mail é normalizado para minúsculas e limitado a 254. No cadastro, a senha exige 8–15 caracteres Unicode, uma maiúscula (incluindo acentuadas), um número de 0 a 9 e um caractere especial; `confirmPassword` deve ser igual. A política e a igualdade são validadas também no backend, sem remover espaços, e a confirmação nunca é armazenada. O login recebe somente e-mail/senha, sem confirmação ou exigência de composição, aceitando senhas não vazias de até 128 caracteres para manter contas antigas acessíveis. Campos extras, inclusive `role` e `isActive`, são rejeitados. Cadastro cria exclusivamente uma conta USER ativa e inicia a sessão. E-mail já cadastrado retorna `409`; login de conta ausente, inativa ou com senha incorreta retorna o mesmo `401`. Dados inválidos retornam `400`, JSON acima de 8 KB reais `413`, formato incompatível `415` e origem não permitida `403`. Falhas internas não expõem detalhes. Todas as respostas têm `Cache-Control: no-store`.

Senhas usam `scrypt` assíncrono (`N=131072`, `r=8`, `p=1`), salt aleatório de 16 bytes e comparação em tempo constante, conforme os [parâmetros da OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#scrypt). O servidor admite até dois cálculos simultâneos por instância; saturação retorna `503`. Cada operação/e-mail tem limite compartilhado de dez tentativas por quinze minutos no PostgreSQL, incluindo tentativas bem-sucedidas; excesso retorna `429` com `Retry-After: 900`. Antes de exposição pública, configurar também os limites de tráfego por IP na infraestrutura conforme a capacidade da implantação.

A migração `20261115010000_criar_sessoes_autenticacao` acrescenta `Session` e `AuthRateLimit` sem modificar os anúncios. As sessões duram sete dias, com token aleatório de 32 bytes e somente seu hash SHA-256 persistido. O cookie é HttpOnly, SameSite=Lax, Path=/ e sem Domain; em produção usa `Secure` e o nome `__Host-portal_session`, exigindo HTTPS no navegador. Em desenvolvimento usa `portal_session`. Login/cadastro rotacionam a sessão apresentada; logout revoga no banco. `/me` consulta o perfil e a atividade atuais. Não há token em JSON ou localStorage, nem necessidade de `AUTH_SECRET`.

Configure `AUTH_TRUSTED_ORIGINS` em `apps/api/.env.local` com as origens exatas, separadas por vírgula, por exemplo `https://seu-portal.com.br,https://api.seu-portal.com.br`. Sem configuração, somente as origens locais nas portas 3000/3001 são aceitas. POSTs com Origin precisam pertencer à lista; `Sec-Fetch-Site: cross-site` é recusado. Clientes REST sem Origin são aceitos. Não habilitar CORS com credenciais para origens arbitrárias; o navegador deve usar o proxy do frontend.

Depois de `npm run db:migrate`, é possível exercitar o fluxo no PowerShell:

```powershell
$cadastro = @{ name = 'João de Souza'; email = 'joao@exemplo.com'; password = 'Exemplo2026!'; confirmPassword = 'Exemplo2026!' } | ConvertTo-Json
Invoke-RestMethod http://localhost:3000/api/auth/register -Method Post -ContentType 'application/json' -Body $cadastro -SessionVariable sessao
Invoke-RestMethod http://localhost:3000/api/auth/me -WebSession $sessao
Invoke-RestMethod http://localhost:3000/api/auth/logout -Method Post -WebSession $sessao
```

`npm run api:test` inclui os testes unitários da autenticação; `npm run auth:test:web` valida os formulários, sessão compartilhada e logout em DOM simulado; `npm run api:test:integration` valida o PostgreSQL. Os testes transacionais revertem seus registros; o teste de concorrência remove sua chave exclusiva ao terminar. Com os dois apps iniciados, `npm run auth:test:http` valida cadastro, login, sessão, inatividade, duplicação, origem e logout direto e pelo proxy. Esse comando cria contas com e-mails aleatórios e as remove em `finally`, junto às sessões e aos contadores de teste. URLs podem ser substituídas por `AUTH_TEST_API_URL` e `WEB_URL`.

Sessões vencidas são removidas quando apresentadas a `/me`; excluir a conta remove suas sessões em cascata. Na manutenção do banco, remover periodicamente sessões com `expiresAt <= now()` e contadores com `windowStart <= now() - interval '15 minutes'` para limitar o crescimento das tabelas. A ausência dessa limpeza não torna uma sessão expirada válida.

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

### Feedback de requisições

As operações apresentam carregamento com texto contextual e indicador visual: Entrando, Criando conta, Enviando, Saindo e Tentando novamente. Botões e campos correspondentes ficam desabilitados enquanto a operação está pendente, e as ações de envio/saída/nova tentativa impedem execução simultânea. Sucesso é informado somente após a confirmação real; falhas preservam os dados e liberam nova tentativa.

Busca da landing, busca no catálogo, filtros e ordenação acompanham a transição de navegação com seus próprios estados. Navegações têm um fallback geral, e os detalhes mantêm seus skeletons específicos. Consultas iniciais de sessão/imóveis e recarregamentos mostram progresso; revalidações com dados disponíveis preservam o conteúdo e apresentam uma indicação discreta. As animações respeitam a preferência por movimento reduzido. Não há atrasos artificiais nem um bloqueio global para consultas em segundo plano.

`npm run feedback:test` verifica Promises pendentes, recuperação de falha, prevenção de cliques duplicados e transições de busca/filtros/ordenação. Os testes de autenticação e contato também cobrem envio em andamento e confirmação somente após a resposta.

### Lista de comandos

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
| `npm run auth:test:http` | Validar autenticação real no backend e pelo proxy, removendo as contas de teste. |
| `npm run auth:test:web` | Testar formulários de autenticação, sessão compartilhada e logout em DOM simulado. |
| `npm run feedback:test` | Validar feedback de requisições pendentes, novas tentativas e navegações. |
| `npm run favorites:test` | Testar favoritos, requisições pendentes e isolamento da interface. |
| `npm run favorites:test:http` | Validar favoritos por HTTP direto/proxy com contas descartáveis. |
| `npm run inquiries:test:http` | Validar consultas persistidas por HTTP direto/proxy, sem enviar e-mails reais. |
| `npm run home:test` | Testar a landing page, a busca e o consumo REST sem banco. |
| `npm run db:seed`   | Popular o banco de desenvolvimento com imóveis brasileiros. |
| `npm run db:seed:users` | Criar contas fictícias USER/ADMIN e usuário inativo para testes locais. |
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
