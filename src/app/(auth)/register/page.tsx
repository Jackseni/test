import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-ui";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = { title: "Crear cuenta | FinTrack" };

export default function RegisterPage() {
  return (
    <AuthCard title="Crear cuenta" subtitle="Empieza a controlar tus ingresos y gastos.">
      <RegisterForm />
      <p className="mt-4 text-center text-sm text-muted">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-medium text-accent hover:underline">
          Inicia sesión
        </Link>
      </p>
    </AuthCard>
  );
}
