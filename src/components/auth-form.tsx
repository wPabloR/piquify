"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn, signUp, type ActionState } from "@/app/auth/actions";
import type { AuthField } from "@/domain/presentation";

export function AuthForm({ mode, next }: { mode: "login" | "signup"; next?: string }) {
  const action = mode === "login" ? signIn : signUp;
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      {mode === "signup" && (
        <>
          <Field
            label="Nombre"
            name="name"
            autoComplete="name"
            defaultValue={state.values?.name}
            error={state.fieldErrors?.name}
          />
          <Field
            label="Usuario"
            name="handle"
            autoComplete="username"
            prefix="@"
            defaultValue={state.values?.handle}
            error={state.fieldErrors?.handle}
          />
        </>
      )}
      <Field
        label="Correo"
        name="email"
        type="email"
        autoComplete="email"
        defaultValue={state.values?.email}
        error={state.fieldErrors?.email}
      />
      <Field
        label="Contraseña"
        name="password"
        type="password"
        autoComplete={mode === "login" ? "current-password" : "new-password"}
        error={state.fieldErrors?.password}
      />
      {state.error && (
        <p role="alert" className="text-sm font-medium text-coral">
          {state.error}
        </p>
      )}
      {state.message && (
        <p role="status" className="text-sm font-medium text-palma">
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-xl bg-marea px-4 py-3 text-sm font-semibold text-crema hover:bg-abismo disabled:opacity-60"
      >
        {pending ? "Un momento…" : mode === "login" ? "Entrar" : "Crear cuenta"}
      </button>
      <p className="text-center text-sm text-tinta-suave">
        {mode === "login" ? (
          <Link href="/signup" className="font-semibold text-marea">
            Crear una cuenta
          </Link>
        ) : (
          <Link href="/login" className="font-semibold text-marea">
            Ya tengo cuenta
          </Link>
        )}
      </p>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  autoComplete,
  prefix,
  defaultValue,
  error,
}: {
  label: string;
  name: AuthField;
  type?: string;
  autoComplete: string;
  prefix?: string;
  defaultValue?: string;
  error?: string;
}) {
  const errorId = `${name}-error`;
  return (
    <label className="block text-sm font-semibold text-abismo">
      {label}
      <span
        className={`mt-1.5 flex items-center rounded-xl border bg-crema/50 focus-within:bg-white focus-within:ring-2 ${
          error
            ? "border-coral focus-within:border-coral focus-within:ring-coral/25"
            : "border-abismo/15 focus-within:border-laguna focus-within:ring-laguna/25"
        }`}
      >
        {prefix && <span className="pl-3 text-tinta-suave">{prefix}</span>}
        <input
          id={name}
          name={name}
          type={type}
          required
          autoComplete={autoComplete}
          defaultValue={type === "password" ? undefined : defaultValue}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="h-11 w-full bg-transparent px-3 text-sm font-normal text-tinta outline-none"
        />
      </span>
      {error && (
        <span id={errorId} role="alert" className="mt-1 block text-xs font-medium text-coral">
          {error}
        </span>
      )}
    </label>
  );
}
