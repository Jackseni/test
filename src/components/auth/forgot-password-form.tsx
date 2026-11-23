"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { requestPasswordReset } from "@/app/(auth)/actions";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validations/auth";
import { Field, FormMessage, SubmitButton } from "./auth-ui";

export function ForgotPasswordForm() {
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = handleSubmit((values) => {
    setError(undefined);
    setMessage(undefined);
    startTransition(async () => {
      const result = await requestPasswordReset(values);
      if (result.ok) setMessage(result.message);
      else setError(result.error);
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <FormMessage error={error} message={message} />
      <Field label="Correo electrónico" type="email" autoComplete="email" error={errors.email?.message} {...register("email")} />
      <SubmitButton pending={pending}>{pending ? "Enviando..." : "Enviar enlace"}</SubmitButton>
    </form>
  );
}
