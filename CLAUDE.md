# CLAUDE.md

## Instruções do projeto

Este projeto utiliza **Spec-Driven Development (SDD)**.

Use português do Brasil (`pt-BR`) na interface, nos metadados, nos textos de acessibilidade, nos comentários, na documentação e na comunicação sobre o projeto. Preserve os identificadores técnicos, os contratos de API e os nomes de arquivos definidos na especificação.

O produto é destinado ao Brasil: utilize real brasileiro (`BRL`/`R$`), endereços com bairro, cidade, UF e CEP, telefone com DDD e `+55` e exemplos brasileiros. Consulte os campos e contratos definidos em `spec.md` e `plan.md` ao implementar cada etapa.

Antes de implementar qualquer funcionalidade, leia:

- `specs/portal-inmobiliario/spec.md`
- `specs/portal-inmobiliario/plan.md`
- `specs/portal-inmobiliario/tasks.md`

A especificação é a fonte de verdade do projeto.

## Fluxo de desenvolvimento

1. Leia a especificação e o plano técnico.
2. Revise `tasks.md`.
3. Identifique a primeira tarefa pendente.
4. Implemente apenas essa tarefa.
5. Execute as validações e os testes necessários.
6. Corrija os erros antes de continuar.
7. Marque a tarefa como concluída em `tasks.md`.
8. Não implemente tarefas futuras, a menos que o usuário solicite explicitamente.

## Regras de arquitetura

- Utilize Next.js (versão mais recente disponível) + React + TypeScript.
- Utilize PostgreSQL como único banco de dados da aplicação.
- Utilize API REST por meio dos Route Handlers do Next.js.
- Não utilize Server Actions.
- Os componentes do frontend não devem acessar diretamente o banco de dados.
- Mantenha separadas as responsabilidades de API, lógica de negócio e persistência.
- Utilize Cloudinary para as imagens dos imóveis.
- Utilize Google Maps para exibir a localização dos imóveis.
- Utilize Web3Forms para o formulário de contato.
- Não exponha segredos ao navegador.
- Utilize variáveis de ambiente para credenciais e chaves.

## Regras de implementação

- Analise o código existente antes de modificá-lo.
- Prefira alterações pequenas e incrementais.
- Não adicione funcionalidades fora da tarefa atual.
- Mantenha o TypeScript em modo estrito e evite `any`, salvo quando necessário.
- Valide os dados recebidos pelo backend.
- Proteja os recursos USER e ADMIN também no backend.
- Utilize respostas REST e códigos HTTP consistentes.
- Mantenha a aplicação responsiva.
- Respeite a arquitetura existente.

## Regra de conclusão

Uma tarefa só está concluída quando:

- sua implementação está completa;
- o projeto compila corretamente;
- os testes ou as validações correspondentes são aprovados;
- não há erros conhecidos que impeçam o funcionamento;
- a caixa de seleção correspondente em `tasks.md` está marcada como concluída.

## Protocolo SDD (ESTRITO)

1. ANTES de modificar ou criar qualquer código-fonte, você DEVE ler `specs/portal-inmobiliario/spec.md`.
2. Não escreva código sem um plano aprovado em `specs/portal-inmobiliario/plan.md`.
3. Acompanhe o progresso linha por linha em `specs/portal-inmobiliario/tasks.md`. Marque as tarefas como [x] somente depois que os testes forem aprovados.

## Comandos de compilação e testes

- Instalar dependências: `npm install`
- Executar testes: `npm test`
- Executar o linter: `npm run lint`
- Servidor de desenvolvimento: `npm run dev`

## Estilo de código e arquitetura

- Siga os princípios da Arquitetura Limpa (Clean Architecture).
- Use nomes de variáveis explícitos. Não use abreviações.
- Cada nova funcionalidade deve ter seu teste unitário correspondente.

## Skills disponíveis

| Skill | Caminho | Descrição |
|---|---|---|
| `react-rules` | `.claude/skills/react-rules/SKILL.md` | Padrões de desenvolvimento e regras de arquitetura para projetos e componentes React com TypeScript, Tailwind CSS, Zustand, Zod, React Hook Form e React Query / SWR. |

---

## Regras de ativação das skills

### `react-rules`
- **Ativação**: ative esta skill quando o usuário pedir:
  - Criar uma nova aplicação React ou gerar sua estrutura com TypeScript.
  - Criar, adicionar ou modificar componentes React e layouts com Tailwind CSS.
  - Projetar e implementar hooks personalizados (`useAuth`, `useFetch`, etc.).
  - Gerenciar estado global utilizando Zustand (`create()`).
  - Criar esquemas de validação de dados utilizando Zod (`z.object`, `z.string`, `parse`, `safeParse`).
  - Implementar formulários utilizando React Hook Form com o resolver do Zod.
  - Implementar lógica de interface ou busca de dados em APIs utilizando TanStack Query (React Query) ou SWR.
  - Refatorar código React para seguir os princípios de imutabilidade, pureza e uso correto de `useEffect`.
