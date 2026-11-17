import { z } from "zod";

const email = z.string().trim().max(254).pipe(z.email()).transform((value) => value.toLowerCase());
// A senha não é normalizada: espaços e caracteres Unicode fazem parte dela.
export function getPasswordCriteria(value: string) {
  const length = Array.from(value).length;
  return [
    { id: "length", label: "De 8 a 15 caracteres", met: length >= 8 && length <= 15 },
    { id: "uppercase", label: "Pelo menos uma letra maiúscula", met: /\p{Lu}/u.test(value) },
    { id: "number", label: "Pelo menos um número", met: /[0-9]/.test(value) },
    { id: "special", label: "Pelo menos um caractere especial, ex.: @, !, #", met: /[\p{P}\p{S}]/u.test(value) },
  ];
}

export const passwordSchema = z.string().superRefine((value, context) => {
  for (const criterion of getPasswordCriteria(value)) {
    if (!criterion.met) context.addIssue({ code: "custom", message: criterion.label + "." });
  }
});

// O login mantém compatibilidade com senhas antigas, sem exigir a política de criação.
export const loginPasswordSchema = z.string().min(1, "Informe sua senha.").max(128, "Use no máximo 128 caracteres.");

export const registerSchema = z.strictObject({
  name: z.string().trim().min(2).max(100).regex(/^[^\r\n\x00-\x1f\x7f]+$/),
  email,
  password: passwordSchema,
  confirmPassword: z.string().min(1, "Confirme sua senha."),
}).refine((input) => input.password === input.confirmPassword, {
  path: ["confirmPassword"], message: "As senhas devem ser iguais.",
});

export const loginSchema = z.strictObject({ email, password: loginPasswordSchema });

export const forgotPasswordSchema = z.strictObject({ email });
export const resetTokenSchema = z.string().regex(/^[a-f0-9]{64}$/, "Link inválido. Solicite um novo link de recuperação.");
export const resetPasswordSchema = z.strictObject({
  token: resetTokenSchema,
  password: passwordSchema,
  confirmPassword: z.string().min(1, "Confirme sua senha."),
}).refine((input) => input.password === input.confirmPassword, {
  path: ["confirmPassword"], message: "As senhas devem ser iguais.",
});
export const passwordRecoveryResponseSchema = z.strictObject({ message: z.string() });
export const PASSWORD_RECOVERY_MESSAGE = "Se houver uma conta ativa para este e-mail, você receberá um link para redefinir sua senha. Confira também a pasta de spam.";
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const userRoleSchema = z.enum(["USER", "ADMIN"]);
export type UserRole = z.infer<typeof userRoleSchema>;

export function hasAccessRole(role: UserRole, requiredRole: UserRole): boolean {
  return requiredRole === "USER"
    ? role === "USER" || role === "ADMIN"
    : requiredRole === "ADMIN" && role === "ADMIN";
}

export const authenticatedUserSchema = z.strictObject({
  id: z.uuid(),
  name: z.string(),
  email: z.email(),
  role: userRoleSchema,
});

export const authResponseSchema = z.strictObject({ user: authenticatedUserSchema });
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type AuthenticatedUser = z.infer<typeof authenticatedUserSchema>;
