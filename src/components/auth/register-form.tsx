"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { signUp } from "@/app/(auth)/actions";
import { registerSchema, type RegisterInput } from "@/lib/validations/auth";
import { Field, FormMessage, SubmitButton } from "./auth-ui";

export function RegisterForm() {
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  const onSubmit = handleSubmit((values) => {
    setError(undefined);
    setMessage(undefined);
    startTransition(async () => {
      const result = await signUp(values); // redirects if a session is created
      if (!result) return;
      if (result.ok) setMessage(result.message);
      else setError(result.error);
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <FormMessage error={error} message={message} />
      <Field label="Nombre completo" autoComplete="name" error={errors.fullName?.message} {...register("fullName")} />
      <Field label="Correo electrónico" type="email" autoComplete="email" error={errors.email?.message} {...register("email")} />
      <Field
        label="Contraseña"
        type="password"
        autoComplete="new-password"
        error={errors.password?.message}
        {...register("password")}
      />
      <Field
        label="Confirmar contraseña"
        type="password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register("confirmPassword")}
      />
      <SubmitButton pending={pending}>{pending ? "Creando cuenta..." : "Crear cuenta"}</SubmitButton>
    </form>
  );
}
