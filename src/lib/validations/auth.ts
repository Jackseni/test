import { z } from "zod";

const email = z
  .string({ error: "Ingresa tu correo electrónico" })
  .trim()
  .toLowerCase()
  .min(1, "Ingresa tu correo electrónico")
  .max(254, "El correo es demasiado largo")
  .pipe(z.email("Correo electrónico inválido"));

// 72 = bcrypt's effective limit used by Supabase Auth.
const newPassword = z
  .string({ error: "Ingresa una contraseña" })
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .max(72, "La contraseña no puede superar 72 caracteres");

export const loginSchema = z.object({
  email,
  password: z.string({ error: "Ingresa tu contraseña" }).min(1, "Ingresa tu contraseña").max(72, "Contraseña inválida"),
});

export const registerSchema = z
  .object({
    fullName: z
      .string({ error: "Ingresa tu nombre" })
      .trim()
      .min(1, "Ingresa tu nombre")
      .max(100, "El nombre no puede superar 100 caracteres"),
    email,
    password: newPassword,
    confirmPassword: z.string({ error: "Confirma tu contraseña" }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Las contraseñas no coinciden",
  });

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({ password: newPassword, confirmPassword: z.string({ error: "Confirma tu contraseña" }) })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Las contraseñas no coinciden",
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
