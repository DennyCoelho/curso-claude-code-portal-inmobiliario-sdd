# Skill: react-rules

**Descrição:** Gera um projeto ou componente React com TypeScript seguindo as melhores práticas atuais.

## Gatilhos de ativação

Use esta skill quando o usuário:

- Pedir para criar uma nova aplicação React
- Pedir para criar ou modificar componentes React
- Adicionar ou modificar hooks, estado, formulários ou lógica de interface no React

---

## Instruções

### Versão e linguagem

- Utilize Next.js (versão mais recente disponível) + **React 19.2.8 ou superior**. Verifique a versão disponível em https://www.npmjs.com/package/react antes de gerar a estrutura inicial do projeto.
- Utilize **TypeScript** em vez de JavaScript para tipagem estática, segurança e facilidade de manutenção.
- Utilize PostgreSQL como único banco de dados da aplicação.
- Utilize API REST por meio dos Route Handlers do Next.js.
- Não utilize Server Actions.
- Utilize uma estrutura monorepo.

### Estado global

- Use **Zustand** para o estado global: crie um store com `create()`, definindo o estado e as ações no mesmo objeto.

```ts
import { create } from 'zustand'

type Store = { count: number; increment: () => void }
const useStore = create<Store>((set) => ({
  count: 0,
  increment: () => set((s) => ({ count: s.count + 1 })),
}))
```

### Validação de dados

- Use **Zod** para validar dados com esquemas (`z.object`, `z.string`, etc.).
- Valide com `.parse()` (lança um erro) ou `.safeParse()` (retorna `{ success, data, error }`).

### Formulários

- Integre **Zod + React Hook Form** nos formulários: use `zodResolver` do pacote `@hookform/resolvers/zod`.

```ts
const schema = z.object({ email: z.string().email() })
const { register, handleSubmit } = useForm({ resolver: zodResolver(schema) })
```

### Componentes

- Mantenha os componentes **pequenos, simples e com uma única responsabilidade**.
- Nunca altere o estado diretamente — sempre crie novas cópias dos objetos ou arrays.

### useEffect

- Use `useEffect` **apenas** para sincronizar com sistemas externos (API, DOM, bibliotecas de terceiros).
- Não use `useEffect` para lógica derivada de props ou estado — faça o cálculo durante a renderização ou nos handlers.
- Mantenha os efeitos simples, com dependências explícitas e claras.

### Handlers vs. efeitos

- A lógica causada pela interação do usuário deve ficar nos **event handlers**, e não no `useEffect`.
- Para comunicar alterações ao componente pai, use callbacks passados por props e execute-os no componente filho quando apropriado.

### Hooks personalizados

- Extraia a lógica reutilizável para **hooks personalizados** (`useAuth`, `useFetch`, etc.) para manter os componentes simples.
- Compartilhe lógica entre eventos usando funções reutilizáveis ou hooks, sem duplicar código.

### Desempenho

- Use `useMemo` para armazenar em cache os resultados de cálculos custosos.
- Para reiniciar ou ajustar o estado: use `key`, derive o estado das props ou atualize-o em eventos.

### Regras dos hooks

- Não chame hooks dentro de loops, condicionais ou funções aninhadas.
- Os componentes e hooks devem ser **puros** — sem efeitos colaterais durante a renderização.

### Busca de dados

- Use **React Query** ou **SWR** quando o componente precisar buscar dados de uma API e compartilhá-los entre vários componentes, aproveitando o cache e a revalidação automática.

### Estilos e design de interface com Tailwind CSS

- **Classes utilitárias:** utilize classes utilitárias do Tailwind CSS para definir o layout e os estilos dos componentes de interface.
- **Classes condicionais e dinâmicas:** para combinar classes dinâmicas ou condicionais sem conflitos de especificidade ou duplicações, utilize a função utilitária `cn` (com `clsx` e `tailwind-merge`):

  ```typescript
  import { clsx, type ClassValue } from 'clsx'
  import { twMerge } from 'tailwind-merge'

  export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
  }
  ```

- **Design responsivo e temas:** utilize os prefixos integrados do Tailwind (`sm:`, `md:`, `lg:`, `dark:`) para garantir interfaces adaptáveis a diferentes dispositivos e suporte ao modo escuro.

---

## Estrutura do projeto (referência)

```text
src/
├── components/        # Componentes de interface por funcionalidade
├── hooks/             # Hooks personalizados reutilizáveis
├── stores/            # Stores do Zustand
├── schemas/           # Esquemas do Zod
├── types/             # Tipos TypeScript compartilhados
└── lib/               # Utilitários e clientes de API
```
