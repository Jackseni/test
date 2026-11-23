"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { signIn } from "@/app/(auth)/actions";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { Field, FormMessage, SubmitButton } from "./auth-ui";

export function LoginForm() {
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit((values) => {
    setError(undefined);
    startTransition(async () => {
      const result = await signIn(values); // redirects on success
      if (result && !result.ok) setError(result.error);
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <FormMessage error={error} />
      <Field label="Correo electrónico" type="email" autoComplete="email" error={errors.email?.message} {...register("email")} />
      <Field
        label="Contraseña"
        type="password"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register("password")}
      />
      <SubmitButton pending={pending}>{pending ? "Ingresando..." : "Iniciar sesión"}</SubmitButton>
    </form>
  );
}
