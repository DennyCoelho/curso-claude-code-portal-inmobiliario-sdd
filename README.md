# Portal Imobiliário — SDD

Portal imobiliário para o Chile desenvolvido por meio de **Spec-Driven Development (SDD)** — desenvolvimento orientado por especificações.

## Desenvolvimento local

Requisitos: Node.js 20.9 ou superior e npm 10 ou superior. A estrutura inicial foi preparada com Next.js 16.4.3, React 19.3.1 e TypeScript em modo estrito.

Execute a partir da raiz do repositório:

```powershell
npm install
Copy-Item .env.example apps/web/.env.local
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000). A Etapa 2 inclui o layout compartilhado, o cabeçalho, o rodapé e a navegação responsiva. Em dispositivos móveis, o botão de menu exibe os links e permite fechar o menu com a tecla Escape. Também há um link para pular para o conteúdo usando o teclado.

Os destinos `/properties` e `/login` são páginas provisórias de navegação. Comprar e Alugar direcionam para `/properties?operation=SALE` e `/properties?operation=RENT`; o catálogo, os filtros e a autenticação serão implementados nas respectivas etapas.

O Next.js carrega as variáveis de ambiente de `apps/web/.env.local`, pois esse é o diretório da aplicação. O arquivo `.env.example` documenta a configuração prevista; a inicialização não exige PostgreSQL nem credenciais das integrações. Preencha os valores nas tarefas correspondentes e mantenha os segredos no servidor.

## Comandos

| Comando             | Finalidade                                             |
| ------------------- | ------------------------------------------------------ |
| `npm run dev`       | Iniciar o servidor de desenvolvimento.                 |
| `npm run build`     | Gerar e verificar a compilação de produção.            |
| `npm start`         | Servir a compilação de produção.                       |
| `npm run lint`      | Executar o ESLint sem permitir avisos.                 |
| `npm run typecheck` | Gerar os tipos das rotas e verificar o TypeScript.     |
| `npm test`          | Executar as validações estáticas: ESLint e TypeScript. |

Os testes das funcionalidades serão incorporados durante sua implementação. Por enquanto, a validação de execução consiste em compilar e verificar se os servidores de desenvolvimento e de produção retornam uma resposta HTTP correta.

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
