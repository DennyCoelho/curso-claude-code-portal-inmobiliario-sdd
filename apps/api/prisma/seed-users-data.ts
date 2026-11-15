// Credenciais públicas de demonstração, exclusivas para testes locais.
export const seedUsers = [
  {
    id: "a2170000-0000-4000-8000-000000000001",
    name: "João Usuário Teste",
    email: "usuario@exemplo.test",
    password: "Usuario2026!",
    role: "USER",
    isActive: true,
  },
  {
    id: "a2170000-0000-4000-8000-000000000002",
    name: "Ana Administradora Teste",
    email: "admin@exemplo.test",
    password: "Admin2026!",
    role: "ADMIN",
    isActive: true,
  },
  {
    id: "a2170000-0000-4000-8000-000000000003",
    name: "Carlos Inativo Teste",
    email: "inativo@exemplo.test",
    password: "Inativo2026!",
    role: "USER",
    isActive: false,
  },
] as const;
