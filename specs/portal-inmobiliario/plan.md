# Plano técnico — Portal Imobiliário

## 1. Arquitetura

O Next.js será utilizado como framework full stack, mantendo uma arquitetura REST clara.

```text
Next.js + React
      │
    fetch()
      │
      ▼
API REST /api/**
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

## 3. Restrições

- Não utilizar Server Actions.
- Não acessar o PostgreSQL diretamente a partir de componentes React.
- Não armazenar imagens binárias no PostgreSQL.
- Não exigir latitude/longitude no formulário ADMIN.
- Não implementar funcionalidades especulativas fora de `spec.md`.

## 4. Estrutura sugerida

```text
src/
├── app/
│   ├── api/
│   ├── admin/
│   ├── account/
│   ├── properties/
│   └── ...
├── components/
├── services/
├── repositories/
├── lib/
├── types/
└── ...
```

Adaptar quando as convenções atuais do Next.js justificarem, sem comprometer a separação de responsabilidades.

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

## 6. Persistência

O PostgreSQL é o único banco de dados.

Selecionar um ORM compatível com as versões atuais do Next.js e do PostgreSQL.

Requisitos:

- migrações;
- chaves estrangeiras;
- restrições de unicidade;
- índices quando justificados;
- seed para desenvolvimento.

Restrições importantes:

- `User.email` único;
- combinação `(userId, propertyId)` única nos favoritos.

## 7. API REST

Imóveis públicos:

```text
GET /api/properties
GET /api/properties/{id}
```

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
commune
city
region
sort
```

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

- endereço;
- comuna;
- cidade;
- região;
- país.

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

Criar `.env.example` sem segredos reais.

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
- comportamento responsivo.

## 17. Definição de conclusão

Uma tarefa está concluída quando:

- atende a `spec.md`;
- respeita este plano;
- o build é executado com sucesso;
- as validações correspondentes são aprovadas;
- não há erros que impeçam a conclusão;
- sua caixa de seleção é atualizada em `tasks.md`.
