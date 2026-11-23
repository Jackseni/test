import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/auth-ui";
import { CallbackError } from "@/components/auth/callback-error";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Iniciar sesión | FinTrack" };

export default function LoginPage() {
  return (
    <AuthCard title="Iniciar sesión" subtitle="Accede a tus finanzas personales.">
      <Suspense>
        <CallbackError />
      </Suspense>
      <LoginForm />
      <div className="mt-4 space-y-1 text-center text-sm text-muted">
        <p>
          <Link href="/forgot-password" className="font-medium text-accent hover:underline">
            ¿Olvidaste tu contraseña?
          </Link>
        </p>
        <p>
          ¿No tienes cuenta?{" "}
          <Link href="/register" className="font-medium text-accent hover:underline">
            Regístrate
          </Link>
        </p>
      </div>
    </AuthCard>
  );
}
