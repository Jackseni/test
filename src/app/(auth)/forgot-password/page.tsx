import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-ui";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = { title: "Recuperar contraseña | FinTrack" };

export default function ForgotPasswordPage() {
  return (
    <AuthCard title="Recuperar contraseña" subtitle="Te enviaremos un enlace para restablecerla.">
      <ForgotPasswordForm />
      <p className="mt-4 text-center text-sm text-muted">
        <Link href="/login" className="font-medium text-accent hover:underline">
          Volver a iniciar sesión
        </Link>
      </p>
    </AuthCard>
  );
}
