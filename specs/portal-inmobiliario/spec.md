# Especificação do produto — Portal Imobiliário

## 1. Visão do produto

Construir um portal imobiliário full stack voltado inicialmente ao mercado chileno.

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
- preço;
- área útil em metros quadrados;
- área total em metros quadrados;
- número de quartos;
- número de banheiros;
- número de vagas de garagem;
- idade do imóvel;
- endereço;
- comuna;
- cidade;
- região;
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

Deve oferecer suporte a `USD`.

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

- endereço;
- comuna;
- cidade;
- região.

Exemplo:

```text
Av. Apoquindo 3000
Las Condes
Santiago
Región Metropolitana
```

A aplicação construirá um endereço completo que possa ser utilizado pelo Google Maps.

```text
Av. Apoquindo 3000, Las Condes, Santiago, Región Metropolitana, Chile
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
- comuna ou localização;
- quartos;
- banheiros;
- área útil.

---

## 9. Busca

Permitir busca textual nas informações relevantes:

- título;
- comuna;
- cidade;
- região;
- descrição.

A busca deve ser representada por parâmetros de consulta.

```text
/properties?search=providencia
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
- comuna;
- cidade;
- região.

Os filtros devem ser representados na URL.

```text
/properties?operation=SALE&commune=las-condes&bedrooms=3
```

---

## 11. Ordenação

Permitir:

- mais recentes;
- preço do menor para o maior;
- preço do maior para o menor;
- área da menor para a maior;
- área da maior para a menor.

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

---

## 13. Google Maps

A página de detalhes deve exibir o Google Maps utilizando o endereço textual do imóvel.

A configuração deve ser gerenciada por variáveis de ambiente.

O administrador não precisa conhecer coordenadas geográficas.

---

## 14. Contato e solicitações

Integrar o Web3Forms.

Campos visíveis:

- nome;
- e-mail;
- telefone;
- mensagem.

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

Oferecer suporte a:

- cadastro;
- login;
- logout;
- consulta do usuário autenticado.

As senhas devem ser armazenadas utilizando hashing seguro.

Não armazenar informações sensíveis de autenticação em `localStorage`.

---

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
- preço;
- área útil;
- área total;
- quartos;
- banheiros;
- vagas de garagem;
- idade do imóvel;
- endereço;
- comuna;
- cidade;
- região;
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
- não houver erros conhecidos que impeçam o funcionamento.
