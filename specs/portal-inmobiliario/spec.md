# Especificação do produto — Portal Imobiliário

## 1. Visão do produto

Construir um portal imobiliário full stack voltado ao mercado brasileiro.

A interface, os textos de acessibilidade e os metadados devem utilizar português do Brasil (`pt-BR`).

O código será organizado em um monorepo com duas aplicações Next.js independentes: frontend em `apps/web` e backend REST em `apps/api`. A comunicação entre elas deve ocorrer exclusivamente por HTTP. Contratos públicos TypeScript ficam em `packages/contracts`; banco de dados, regras de negócio e credenciais pertencem ao backend.

Os visitantes poderão descobrir imóveis à venda ou para aluguel, buscá-los e filtrá-los, consultar suas informações completas, visualizar fotografias e uma localização aproximada no mapa, além de solicitar informações sobre um imóvel.

Os usuários cadastrados poderão salvar imóveis de interesse e consultar os imóveis sobre os quais enviaram solicitações.

Os administradores poderão gerenciar o portal por meio de uma área administrativa privada.

---

## 2. Tipos de usuário

### Visitante

Pode:

- acessar a landing page;
- navegar pelos imóveis publicados;
- buscar imóveis;
- aplicar filtros;
- ordenar resultados;
- consultar os detalhes de um imóvel;
- visualizar a galeria;
- consultar características;
- visualizar a localização pelo Google Maps;
- enviar uma solicitação de informações;
- cadastrar-se;
- entrar na conta.

### USER

Pode realizar todas as ações públicas e também:

- sair da conta;
- acessar sua conta;
- salvar imóveis como favoritos ou de interesse;
- remover imóveis salvos;
- consultar seus imóveis de interesse;
- consultar os imóveis sobre os quais enviou solicitações.

### ADMIN

Pode realizar as ações anteriores e também:

- acessar o painel administrativo;
- criar imóveis;
- editar imóveis;
- excluir imóveis;
- publicar e despublicar imóveis;
- marcar imóveis como destaque;
- gerenciar imagens;
- gerenciar características;
- gerenciar usuários;
- analisar solicitações de informações.

---

## 3. Informações de um imóvel

Cada imóvel deve oferecer suporte, no mínimo, a:

- título;
- descrição;
- tipo de operação;
- tipo de imóvel;
- preço em reais (BRL);
- área útil em metros quadrados;
- área total em metros quadrados;
- número de quartos;
- número de banheiros;
- número de vagas de garagem;
- idade do imóvel;
- logradouro;
- número (texto, incluindo `s/n` quando necessário);
- complemento (opcional);
- bairro;
- cidade;
- estado (UF);
- CEP;
- país definido automaticamente como Brasil (`BR`);
- status de publicação;
- indicador de imóvel em destaque;
- data de criação;
- data de atualização.

### Tipo de operação

Valores:

- `SALE`
- `RENT`

### Tipo de imóvel

Valores iniciais:

- `HOUSE`
- `APARTMENT`
- `LAND`
- `OFFICE`
- `COMMERCIAL`
- `OTHER`

### Moeda

Utilizar o real brasileiro (`BRL`, símbolo `R$`) como moeda do portal.

Exibir preços com a formatação `pt-BR`, por exemplo, `R$ 450.000,00`. Os valores devem ser armazenados com precisão decimal e duas casas decimais. A formatação monetária pertence à interface.

Os preços de venda representam o valor total do imóvel. Os preços de aluguel representam o valor mensal, identificado na interface, por exemplo, `R$ 2.500,00/mês`.

Alguns campos poderão ser opcionais quando não se aplicarem ao tipo de imóvel.

---

## 4. Características do imóvel

As características devem ser modeladas de forma flexível.

Exemplos:

- piscina;
- academia;
- espaço para churrasco;
- lavanderia;
- jardim;
- terraço;
- depósito;
- elevador;
- portaria;
- segurança;
- aquecimento;
- ar-condicionado;
- aceita animais de estimação.

Não criar uma coluna booleana em `Property` para cada característica.

Um imóvel pode ter várias características, e uma característica pode pertencer a vários imóveis.

---

## 5. Imagens

Um imóvel pode conter várias imagens.

Deve ser possível:

- enviar várias imagens;
- definir uma imagem principal;
- ordenar imagens;
- excluir imagens.

As imagens são armazenadas no Cloudinary.

O PostgreSQL armazena apenas as informações necessárias para relacioná-las e gerenciá-las:

- URL;
- `publicId` do Cloudinary;
- posição;
- indicador de imagem principal.

---

## 6. Localização

O administrador não deve inserir latitude nem longitude manualmente.

O formulário utiliza:

- logradouro;
- número;
- complemento (opcional);
- bairro;
- cidade;
- estado (UF);
- CEP.

O país é definido automaticamente como Brasil (`BR`). O estado deve ser uma UF brasileira válida em maiúsculas. O CEP deve ser armazenado como texto com oito dígitos, preservando zeros à esquerda, e exibido no formato `00000-000`.

Exemplo ilustrativo de preenchimento:

```text
Avenida Exemplo
100
Apartamento 201
Centro
São Paulo
SP
01000-000
```

A aplicação construirá um endereço completo que possa ser utilizado pelo Google Maps, acrescentando Brasil. O complemento pode ser omitido da consulta ao mapa.

```text
Avenida Exemplo, 100, Centro, São Paulo - SP, 01000-000, Brasil
```

A localização exibida publicamente pode ser aproximada quando apropriado.

Latitude e longitude não devem ser campos obrigatórios no formulário administrativo.

---

## 7. Landing page

Deve incluir:

- cabeçalho;
- navegação;
- seção principal de destaque (hero);
- campo de busca principal;
- imóveis em destaque;
- imóveis à venda;
- imóveis para aluguel;
- chamadas para ação;
- rodapé.

Navegação pública inicial:

- Início
- Imóveis
- Comprar
- Alugar
- Entrar

---

## 8. Catálogo

O catálogo deve:

- exibir apenas imóveis publicados;
- utilizar uma grade responsiva;
- utilizar cards reutilizáveis;
- contemplar estados de carregamento, ausência de resultados e erro.

Cada card exibirá, quando aplicável:

- imagem principal;
- título;
- preço;
- operação;
- tipo;
- bairro, cidade e UF;
- quartos;
- banheiros;
- área útil.

---

## 9. Busca

Permitir busca textual nas informações relevantes:

- título;
- bairro;
- cidade;
- estado (UF);
- descrição.

A busca deve ser representada por parâmetros de consulta.

```text
/properties?search=pinheiros
```

---

## 10. Filtros

Permitir combinar:

- venda/aluguel;
- tipo de imóvel;
- preço mínimo;
- preço máximo;
- quartos;
- banheiros;
- área útil mínima;
- bairro;
- cidade;
- estado (UF).

Os filtros devem ser representados na URL.

O catálogo deve apresentar os filtros em um painel lateral à esquerda dos cards, com opção de recolher e expandir. No celular, o painel pode se acomodar acima dos resultados. Tipos de imóvel devem utilizar checkboxes com seleção múltipla; os tipos selecionados são combinados por OR, e os demais filtros por AND. A faixa de preço deve utilizar uma barra com duas alças, exibindo mínimo e máximo em BRL. Quartos deve oferecer qualquer quantidade, 1, 2, 3 ou 4 ou mais: 1, 2 e 3 correspondem a quantidades exatas e 4 ou mais a um mínimo de quatro.

A barra de preço deve iniciar em R$ 0 e terminar em R$ 10.000.000, independentemente da operação. Os passos são de R$ 100 até R$ 5.000, R$ 500 acima de R$ 5.000 até R$ 10.000, R$ 1.000 acima de R$ 10.000 até R$ 50.000, R$ 5.000 acima de R$ 50.000 até R$ 100.000, R$ 10.000 acima de R$ 100.000 até R$ 1.000.000 e R$ 50.000 acima de R$ 1.000.000. Banheiros deve oferecer as mesmas opções de quartos, com igualdade em 1/2/3 e mínimo de quatro em 4 ou mais. Depois de área útil, os campos devem seguir Estado (UF), Cidade e Bairro.

Os valores mínimo e máximo devem ser campos editáveis, sincronizados com as duas alças. Digitar um valor atualiza a posição correspondente na barra e mover uma alça preenche o campo. A digitação deve aceitar valores em reais, inclusive centavos, dentro de zero a R$ 10 milhões; os incrementos continuam aplicados ao movimento da barra. Não exibir a legenda que descreve os incrementos.

```text
/properties?operation=SALE&neighborhood=pinheiros&city=sao-paulo&state=SP&bedrooms=3
```

---

## 11. Ordenação

Permitir:

- mais recentes;
- preço do menor para o maior;
- preço do maior para o menor;
- área da menor para a maior;
- área da maior para a menor.

A ordenação deve usar o parâmetro `sort` na URL do catálogo e da API REST: `recent` (padrão), `price_asc`, `price_desc`, `area_asc` e `area_desc`. Ordenar por área útil, identificada no seletor; imóveis sem área útil ficam ao final em ambos os sentidos. Empates são resolvidos por data de criação mais recente e ID crescente. A seleção deve preservar a busca e todos os filtros e funcionar ao recarregar ou navegar no histórico. Parâmetros inválidos ou repetidos devem permitir correção no catálogo e retornar `400` na API.

Durante o carregamento, anunciar o estado e exibir skeletons com a estrutura da grade, respeitando a preferência por movimento reduzido. Não apresentar imóveis de outra busca, filtro ou ordenação. Diferenciar catálogo vazio e combinações sem resultados; falhas devem oferecer nova tentativa preservando a seleção.

---

## 12. Detalhes do imóvel

Exibir:

- título;
- preço;
- descrição;
- operação;
- tipo;
- área útil;
- área total;
- quartos;
- banheiros;
- vagas de garagem;
- idade do imóvel;
- características;
- galeria;
- localização;
- formulário de contato.

Na Etapa 13, disponibilizar `/properties/{id}` com as informações públicas completas, foto principal e endereço brasileiro textual. Os cards devem abrir os detalhes e permitir voltar ao catálogo preservando busca, filtros e ordenação. Dados opcionais ausentes não devem ser inventados; zeros válidos devem permanecer visíveis. Tratar carregamento, imóvel indisponível e falha com nova tentativa. Galeria, mapa e contato serão acrescentados nas respectivas etapas.

Na Etapa 14, a galeria deve apresentar a imagem principal primeiro, miniaturas selecionáveis, contador e navegação circular por botões e teclado, sem reprodução automática. As demais fotos seguem a posição cadastrada. Adaptar a foto e as miniaturas ao celular, tablet e computador, com textos alternativos, foco visível e anúncio da posição selecionada. Imóveis sem foto ou com uma única foto não exibem controles desnecessários; falhas de imagem mantêm o tratamento de indisponibilidade e permitem continuar navegando.

---

## 13. Google Maps

A página de detalhes deve exibir o Google Maps utilizando logradouro, número, bairro, cidade, UF, CEP e Brasil no endereço textual do imóvel.

A configuração deve ser gerenciada por variáveis de ambiente.

Na Etapa 15, preservar o endereço textual e acrescentar um mapa responsivo com localização aproximada, idioma pt-BR, carregamento sob demanda e título acessível. A consulta deve usar o endereço completo com CEP formatado e Brasil, sem exigir o complemento. Oferecer também um link para abrir o mesmo endereço no Google Maps caso a incorporação não carregue. O zoom é configurável pelo ambiente; a incorporação pública não exige uma chave da Maps Embed API nem expõe credenciais privadas.

O administrador não precisa conhecer coordenadas geográficas.

---

## 14. Contato e solicitações

Integrar o Web3Forms.

Na Etapa 16, disponibilizar o formulário nos detalhes do imóvel e preparar o contato por REST no backend, que valida os dados, confirma que o imóvel está publicado e inclui seu ID e título canônicos. O telefone é obrigatório e exige celular com DDD brasileiro válido e onze dígitos nacionais, normalizado com `+55`. O navegador envia o payload preparado diretamente ao Web3Forms, seguindo o fluxo gratuito oficial. A access key do Web3Forms é uma configuração pública do formulário, entregue somente na preparação; segredos das demais integrações permanecem no backend. Preparação não é confirmação de envio: exibir sucesso somente após a confirmação do Web3Forms. Ausência de configuração e falhas devem preservar os campos e ser informadas sem simular sucesso. Persistência e vínculo com usuário serão implementados na Etapa 21.

Campos visíveis:

- nome;
- e-mail;
- telefone com DDD;
- mensagem.

O contato deve exigir um celular brasileiro com DDD válido e onze dígitos nacionais, incluindo o 9 inicial do celular. Aceitar o prefixo internacional `+55` e normalizar no backend para o formato internacional. Aplicar a máscara `(xx) xxxxx-xxxx` durante a digitação/colagem, impedir dígitos excedentes e rejeitar o envio de números incompletos. Campos obrigatórios devem exibir asterisco; usar os placeholders `João de Souza`, `seuemail@exemplo.com`, `(99) 99999-9999` e `Escreva sua mensagem aqui` nos respectivos campos.

Adicionar automaticamente:

- ID do imóvel;
- título do imóvel.

Exibir os estados:

- enviando;
- enviado;
- erro.

A solicitação também deve ser persistida no PostgreSQL.

Se houver um usuário autenticado, vincular a solicitação a ele.

Visitantes não autenticados também podem realizar consultas.

---

## 15. Autenticação

Para testes locais, disponibilizar contas fictícias com perfis USER e ADMIN ativos e uma conta USER inativa. O seed dessas contas deve ser explícito, recusado em produção e preservar edições em reexecuções. As permissões e funcionalidades de cada perfil seguem as etapas correspondentes.

Oferecer suporte a:

- cadastro;
- login;
- logout;
- consulta do usuário autenticado.

As senhas devem ser armazenadas utilizando hashing seguro.

Não armazenar informações sensíveis de autenticação em `localStorage`.

Na Etapa 17, disponibilizar os quatro recursos REST de autenticação. Cadastro exige nome de 2–100 caracteres, e-mail válido e senha de 8–15 caracteres, com ao menos uma letra maiúscula, um número e um caractere especial (pontuação ou símbolo Unicode, como @, ! e #). Espaços não contam como especiais; não bloquear sequências nem exigir minúscula. Contar os caracteres Unicode sem alterar a senha. Exigir também confirmação igual em `confirmPassword`, validada no frontend e no backend sem persistência. Normalizar o e-mail para minúsculas e preservar a senha integralmente. A conta nasce ativa com perfil USER; o visitante não pode escolher perfil nem status. Cadastro bem-sucedido também inicia a sessão. Login recebe somente e-mail/senha, aceita senhas existentes de até 128 caracteres e deve recusar contas inativas e responder de forma idêntica para e-mail ausente, conta inativa ou senha incorreta.

No cadastro, acompanhar comprimento, maiúscula, número e especial durante a digitação com texto e ícone de critério atendido. O requisito de especial deve apresentar exemplos: “Pelo menos um caractere especial, ex.: @, !, #”. Mostrar a confirmação de igualdade quando o campo de repetição começar a ser preenchido, atualizando também ao editar a primeira senha. Critérios pendentes começam neutros; erros e foco aparecem ao tentar enviar. Atualizar as senhas das três contas de demonstração para o mesmo padrão, preservando seus perfis e estados.

Disponibilizar botão de mostrar/ocultar senha nos três campos: senha do login, senha do cadastro e confirmação do cadastro. Os controles são independentes, começam com as senhas ocultas, preservam o texto digitado e funcionam por teclado, com rótulos acessíveis e indicação do estado. Não enviar o formulário ao alternar a visibilidade. Durante envio, desabilitar os controles; após sucesso, limpar e ocultar os campos.

Utilizar sessões opacas persistidas no PostgreSQL com validade absoluta de sete dias, token aleatório entregue somente por cookie HttpOnly e hash do token no banco. Autenticação bem-sucedida troca a sessão apresentada; logout revoga a sessão no servidor e expira o cookie. O endpoint do usuário atual retorna somente ID, nome, e-mail e perfil, verificando a conta ativa e a validade a cada consulta. Senhas, hashes e tokens não integram respostas JSON nem logs. Limitar tentativas de cadastro/login e proteger os POSTs contra origens não permitidas. Oferecer os formulários públicos em `/login` e `/register`, com validação acessível, estados pendente/erro, controle da sessão e logout. Após acesso confirmado, limpar a senha e oferecer navegação ao catálogo. Autorização e área privada seguem as Etapas 18 e 19.

---

### Recuperação de senha solicitada

Oferecer “Esqueci minha senha” no login, `/forgot-password` e `/reset-password`. Receber o e-mail por REST e responder de forma idêntica para contas ausentes, inativas e ativas. Enviar para a conta ativa um link com token aleatório de uso único, válido por 30 minutos, mantendo somente seu hash no PostgreSQL. Uma nova solicitação substitui o link anterior. Não alterar senha ou sessões antes da confirmação.

Exigir a política de senha do cadastro e confirmação igual, com critérios, mostrar/ocultar, validação acessível, progresso, proteção contra envio duplicado e erros recuperáveis. Recusar links inválidos, expirados e já utilizados, oferecendo nova solicitação. Redefinir a senha, consumir os links e revogar todas as sessões da conta em uma transação; exigir novo login. Contas inativas permanecem inativas.

Integrar e-mails transacionais pelo Resend no backend, com credenciais e URL pública configuradas pelo ambiente. Sem configuração, informar indisponibilidade para todas as solicitações. Não expor tokens em respostas REST, logs ou armazenamento local; usar fragmento no link para evitar sua transmissão nos acessos HTTP à página. Testes do envio usam provedor simulado, sem disparar e-mails reais.

## 16. Favoritos ou imóveis de interesse

USER pode:

- salvar um imóvel;
- removê-lo dos favoritos;
- listar seus imóveis salvos.

Não permitir duplicações para o mesmo usuário e imóvel.

---

## 17. Conta do usuário

A área privada deve exibir:

- informações básicas;
- imóveis de interesse;
- imóveis sobre os quais foram enviadas consultas.

---

## 18. Painel administrativo

Exibir indicadores como:

- total de imóveis;
- imóveis publicados;
- imóveis à venda;
- imóveis para aluguel;
- usuários;
- consultas.

---

## 19. Administração de imóveis

ADMIN pode:

- listar;
- buscar;
- criar;
- editar;
- excluir;
- publicar/despublicar;
- destacar;
- gerenciar características;
- gerenciar imagens.

Formulário:

- título;
- descrição;
- operação;
- tipo;
- preço em BRL;
- área útil;
- área total;
- quartos;
- banheiros;
- vagas de garagem;
- idade do imóvel;
- logradouro;
- número;
- complemento (opcional);
- bairro;
- cidade;
- estado (UF);
- CEP;
- país Brasil (`BR`), definido automaticamente;
- características;
- publicado;
- em destaque.

Não solicitar latitude nem longitude.

---

## 20. Administração de imagens

ADMIN pode:

- enviar;
- excluir;
- selecionar a imagem principal;
- modificar a ordem.

Ao excluir uma imagem, o Cloudinary e o PostgreSQL devem permanecer sincronizados.

Não deixar referências órfãs.

---

## 21. Administração de usuários

ADMIN pode:

- listar;
- buscar;
- consultar;
- ativar/desativar;
- modificar o perfil de acesso quando apropriado.

A autorização deve sempre ser verificada no backend.

---

## 22. Administração de consultas

ADMIN pode analisar:

- imóvel;
- usuário associado, quando houver;
- nome;
- e-mail;
- telefone;
- mensagem;
- data.

Deve ser possível navegar da consulta para o imóvel correspondente.

---

## 23. Responsividade

A aplicação deve funcionar corretamente em:

- computadores;
- tablets;
- celulares.

Verificar especialmente:

- navegação;
- grade;
- filtros;
- cards;
- galeria;
- formulários;
- mapa;
- conta;
- administração.

---

## 24. Acessibilidade

Toda requisição deve oferecer feedback enquanto estiver em andamento: texto contextual e indicador visual acessível nos envios e novas tentativas, com prevenção de cliques duplicados. Busca, filtros, ordenação e navegação devem apresentar progresso durante a transição e o carregamento dos dados. Preservar conteúdo utilizável em atualizações em segundo plano e informar o resultado real da operação. Indicadores animados devem respeitar movimento reduzido.

Nos formulários de contato, cadastro e entrada, não exibir a mensagem “Campos com * são obrigatórios.”. Informar os campos obrigatórios não preenchidos quando o usuário tentar enviar o formulário, mantendo os erros associados aos campos e o foco no primeiro erro.

Aplicar, no mínimo:

- HTML semântico;
- rótulos nos campos;
- navegação pelo teclado;
- estados de foco;
- textos alternativos;
- hierarquia correta de títulos.

---

## 25. SEO

As páginas públicas dos imóveis devem gerar metadados dinâmicos:

- título;
- descrição;
- Open Graph;
- imagem principal, quando aplicável.

---

## 26. Critérios finais de aceitação

O produto estará funcionalmente concluído quando:

- os visitantes puderem explorar imóveis;
- houver diferenciação entre venda e aluguel;
- a busca funcionar;
- os filtros combinados funcionarem;
- a ordenação funcionar;
- a página de detalhes funcionar;
- a galeria funcionar;
- o Google Maps funcionar;
- o contato funcionar;
- os usuários puderem se cadastrar e se autenticar;
- USER puder gerenciar favoritos;
- USER puder consultar os imóveis sobre os quais entrou em contato;
- ADMIN puder gerenciar imóveis;
- ADMIN puder gerenciar imagens com o Cloudinary;
- ADMIN puder gerenciar características;
- ADMIN puder gerenciar usuários;
- ADMIN puder analisar consultas;
- o PostgreSQL persistir os dados;
- o frontend se comunicar com o backend por REST;
- não forem utilizadas Server Actions;
- a autorização for aplicada no backend;
- a aplicação for responsiva;
- a interface utilizar `pt-BR`, os preços estiverem em BRL e os endereços, filtros e exemplos seguirem o contexto brasileiro;
- não houver erros conhecidos que impeçam o funcionamento.
