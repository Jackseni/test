"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { updatePassword } from "@/app/(auth)/actions";
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/validations/auth";
import { Field, FormMessage, SubmitButton } from "./auth-ui";

export function ResetPasswordForm() {
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema) });

  const onSubmit = handleSubmit((values) => {
    setError(undefined);
    startTransition(async () => {
      const result = await updatePassword(values); // redirects on success
      if (result && !result.ok) setError(result.error);
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <FormMessage error={error} />
      <Field
        label="Nueva contraseña"
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
      <SubmitButton pending={pending}>{pending ? "Guardando..." : "Actualizar contraseña"}</SubmitButton>
    </form>
  );
}
