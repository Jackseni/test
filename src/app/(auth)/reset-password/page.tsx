import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-ui";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = { title: "Nueva contraseña | FinTrack" };

export default function ResetPasswordPage() {
  return (
    <AuthCard title="Nueva contraseña" subtitle="Elige una contraseña segura de al menos 8 caracteres.">
      <ResetPasswordForm />
    </AuthCard>
  );
}
