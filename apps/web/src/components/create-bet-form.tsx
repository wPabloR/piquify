"use client";

import { useState } from "react";
import {
  BET_MAX_OPTIONS,
  BET_MIN_OPTIONS,
  BET_MIN_STAKE,
  BET_OPTION_LABEL_MAX_LENGTH,
  BET_TITLE_MAX_LENGTH,
} from "@piquify/contracts";
import { createBet } from "@/app/playgrounds/actions";
import {
  fieldClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
} from "@/lib/ui";

function toDateTimeLocalMin(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function CreateBetForm({ playgroundId }: { playgroundId: string }) {
  const [options, setOptions] = useState(["", ""]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const minDeadline = toDateTimeLocalMin(new Date());

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);

    const title = String(formData.get("title") ?? "").trim();
    const stake = Number(formData.get("stake"));
    const localDeadline = String(formData.get("deadline") ?? "");
    const deadline = new Date(localDeadline);

    const result = await createBet({
      playgroundId,
      title,
      stake,
      deadline: deadline.toISOString(),
      options,
    });

    if (result?.error) {
      setPending(false);
      setError(result.error);
    }
  }

  return (
    <form action={onSubmit} className="flex flex-col gap-4">
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}
      <label className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
        Título
        <input
          className={fieldClassName}
          type="text"
          name="title"
          required
          minLength={1}
          maxLength={BET_TITLE_MAX_LENGTH}
          autoFocus
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
        Stake (puntos)
        <input
          className={fieldClassName}
          type="number"
          name="stake"
          required
          min={BET_MIN_STAKE}
          step={1}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
        Fecha límite
        <input
          className={fieldClassName}
          type="datetime-local"
          name="deadline"
          required
          min={minDeadline}
        />
      </label>
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm text-zinc-600 dark:text-zinc-400">
          Opciones
        </legend>
        {options.map((option, index) => (
          <div key={index} className="flex gap-2">
            <input
              className={fieldClassName}
              type="text"
              required
              minLength={1}
              maxLength={BET_OPTION_LABEL_MAX_LENGTH}
              value={option}
              onChange={(event) => {
                const next = [...options];
                next[index] = event.target.value;
                setOptions(next);
              }}
              placeholder={`Opción ${index + 1}`}
            />
            {options.length > BET_MIN_OPTIONS ? (
              <button
                className={secondaryButtonClassName}
                type="button"
                onClick={() =>
                  setOptions(options.filter((_, optionIndex) => optionIndex !== index))
                }
              >
                Quitar
              </button>
            ) : null}
          </div>
        ))}
        {options.length < BET_MAX_OPTIONS ? (
          <button
            className="self-start text-sm text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400"
            type="button"
            onClick={() => setOptions([...options, ""])}
          >
            Añadir opción
          </button>
        ) : null}
      </fieldset>
      <button className={primaryButtonClassName} type="submit" disabled={pending}>
        {pending ? "Creando…" : "Crear pique"}
      </button>
    </form>
  );
}
