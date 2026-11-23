import type { InputHTMLAttributes, ReactNode } from "react";
import { BrandLogo } from "@/components/brand/brand-logo";

export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="ft-fade-in relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-surface/80 p-8 shadow-2xl shadow-black/50 backdrop-blur-xl">
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -right-16 size-64 rounded-full bg-primary/25 blur-3xl" />
        <div className="relative">
        <BrandLogo size={64} priority glow className="mb-5" />
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
        <div className="mt-6">{children}</div>
        </div>
      </div>
    </main>
  );
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string };

export function Field({ label, error, id, ...props }: FieldProps) {
  const inputId = id ?? props.name;
  return (
    <div className="space-y-1">
      <label htmlFor={inputId} className="block text-sm font-medium text-foreground">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${inputId}-error` : undefined}
        className="block w-full rounded-full border border-white/10 bg-background/70 px-4 py-2.5 text-foreground placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 aria-[invalid=true]:border-danger"
        {...props}
      />
      {error ? (
        <p id={`${inputId}-error`} className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function SubmitButton({ pending, children }: { pending: boolean; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-full bg-primary-strong px-4 py-2.5 font-semibold text-white shadow-[0_6px_20px_-6px_rgba(124,92,255,0.7)] transition hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60"
    >
      {children}
    </button>
  );
}

export function FormMessage({ error, message }: { error?: string; message?: string }) {
  if (error) {
    return (
      <p role="alert" className="rounded-2xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
        {error}
      </p>
    );
  }
  if (message) {
    return (
      <p role="status" className="rounded-2xl border border-income/30 bg-income/10 px-3 py-2 text-sm text-income">
        {message}
      </p>
    );
  }
  return null;
}
