import { z } from "zod";
import { authenticatedUserSchema, loginPasswordSchema, passwordSchema, registerSchema } from "./auth";

export const updateProfileSchema = z.strictObject({ name: registerSchema.shape.name });
export const changeEmailSchema = z.strictObject({ email: registerSchema.shape.email, currentPassword: loginPasswordSchema });
export const emailChangeTokenSchema = z.string().regex(/^[a-f0-9]{64}$/, "Link de confirmação inválido.");
export const confirmEmailSchema = z.strictObject({ token: emailChangeTokenSchema });
export const changePasswordSchema = z.strictObject({
  currentPassword: z.string().max(128, "Use no máximo 128 caracteres na senha atual."),
  newPassword: z.string().max(128, "Use de 8 a 15 caracteres na nova senha."),
  confirmPassword: z.string().max(128, "Use no máximo 128 caracteres na confirmação."),
}).superRefine((input, context) => {
  if (!input.currentPassword && !input.newPassword && !input.confirmPassword) return;
  if (!input.currentPassword) context.addIssue({ code: "custom", path: ["currentPassword"], message: "Informe sua senha atual." });
  const password = passwordSchema.safeParse(input.newPassword);
  if (!password.success) for (const issue of password.error.issues) {
    context.addIssue({ code: "custom", path: ["newPassword"], message: issue.message });
  }
  if (!input.confirmPassword || input.newPassword !== input.confirmPassword) {
    context.addIssue({ code: "custom", path: ["confirmPassword"], message: "Confirme a nova senha com o mesmo valor." });
  }
});

export const passwordChangeResponseSchema = z.strictObject({ user: authenticatedUserSchema, changed: z.boolean() });
export const emailChangeResponseSchema = z.strictObject({ message: z.string() });
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangeEmailInput = z.infer<typeof changeEmailSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ConfirmEmailInput = z.infer<typeof confirmEmailSchema>;
