import type {
  CreatePiqueInput,
  FieldError,
  PiqueKind,
  ValidCreatePiqueInput,
} from "@/domain/models";

const handlePattern = /^[a-z0-9_]{3,24}$/;
const playgroundEmojis = ["🐚", "🌊", "🌴", "🏖️", "🐠", "⚓", "🌅", "🥥"] as const;

export function emojiForPlayground(name: string): string {
  const normalized = name.trim().replace(/\s+/g, " ").toLocaleLowerCase("es");
  let hash = 2166136261;
  for (const char of normalized) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return playgroundEmojis[(hash >>> 0) % playgroundEmojis.length];
}

export function parseDisplayName(
  value: string,
): { ok: true; value: string } | FieldError {
  const name = value.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 60) {
    return {
      ok: false,
      code: "INVALID_INPUT",
      message: "El nombre debe tener entre 2 y 60 caracteres.",
    };
  }
  return { ok: true, value: name };
}

export function parseHandle(
  value: string,
): { ok: true; value: string } | FieldError {
  const handle = value.trim().toLowerCase();
  if (!handlePattern.test(handle)) {
    return {
      ok: false,
      code: "INVALID_INPUT",
      message: "El usuario debe tener 3–24 caracteres: letras, números o _.",
    };
  }
  return { ok: true, value: handle };
}

export function parsePassword(
  value: string,
): { ok: true; value: string } | FieldError {
  if (value.length < 8 || value.length > 72) {
    return {
      ok: false,
      code: "INVALID_INPUT",
      message: "La contraseña debe tener entre 8 y 72 caracteres.",
    };
  }
  return { ok: true, value };
}

export function parseEmail(
  value: string,
): { ok: true; value: string } | FieldError {
  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 160) {
    return {
      ok: false,
      code: "INVALID_INPUT",
      message: "Introduce un correo válido.",
    };
  }
  return { ok: true, value: email };
}

export function parsePlayground(input: {
  name: string;
  tagline: string;
}):
  | { ok: true; value: { name: string; tagline: string; emoji: string } }
  | FieldError {
  const name = input.name.trim().replace(/\s+/g, " ");
  const tagline = input.tagline.trim().replace(/\s+/g, " ");

  if (name.length < 2 || name.length > 60) {
    return {
      ok: false,
      code: "INVALID_INPUT",
      message: "El playground necesita un nombre de 2 a 60 caracteres.",
    };
  }
  if (tagline.length > 140) {
    return {
      ok: false,
      code: "INVALID_INPUT",
      message: "La descripción admite hasta 140 caracteres.",
    };
  }
  return { ok: true, value: { name, tagline, emoji: emojiForPlayground(name) } };
}

export function parseCreatePique(
  input: CreatePiqueInput & { now?: Date },
): { ok: true; value: ValidCreatePiqueInput } | FieldError {
  const question = input.question.trim().replace(/\s+/g, " ");
  const detail = input.detail.trim().replace(/\s+/g, " ");
  const rawOptions = input.options.map((option) => option.trim().replace(/\s+/g, " ")).filter(Boolean);
  const options = rawOptions.map((option) => canonicalPiqueOption(input.kind, option));
  const kinds: PiqueKind[] = ["options", "date", "number"];
  const closesAt = new Date(input.closesAt);
  const now = input.now ?? new Date();

  if (question.length < 4 || question.length > 180) {
    return {
      ok: false,
      code: "INVALID_INPUT",
      message: "La pregunta debe tener entre 4 y 180 caracteres.",
    };
  }
  if (detail.length > 500) {
    return {
      ok: false,
      code: "INVALID_INPUT",
      message: "Las reglas admiten hasta 500 caracteres.",
    };
  }
  if (!kinds.includes(input.kind)) {
    return { ok: false, code: "INVALID_INPUT", message: "Elige un tipo de respuesta." };
  }
  if (!Number.isInteger(input.stake) || input.stake < 1 || input.stake > 100_000) {
    return {
      ok: false,
      code: "INVALID_INPUT",
      message: "El stake debe ser un entero entre 1 y 100.000.",
    };
  }
  if (Number.isNaN(closesAt.getTime()) || closesAt <= now) {
    return {
      ok: false,
      code: "INVALID_INPUT",
      message: "El cierre tiene que estar en el futuro.",
    };
  }
  if (rawOptions.length < 2 || rawOptions.length > 12 || options.some((option) => option === null)) {
    return {
      ok: false,
      code: "INVALID_INPUT",
      message: optionMessage(input.kind),
    };
  }
  const canonicalOptions = options.filter((option): option is string => option !== null);
  if (canonicalOptions.some((option) => option.length > 80)) {
    return {
      ok: false,
      code: "INVALID_INPUT",
      message: "Cada opción admite hasta 80 caracteres.",
    };
  }
  const unique = new Set(canonicalOptions.map((option) => option.toLocaleLowerCase("es")));
  if (unique.size !== canonicalOptions.length) {
    return {
      ok: false,
      code: "INVALID_INPUT",
      message: "Las opciones no pueden repetirse.",
    };
  }

  return {
    ok: true,
    value: {
      question,
      detail: detail.length > 0 ? detail : null,
      kind: input.kind,
      stake: input.stake,
      closesAt,
      options: canonicalOptions,
    },
  };
}

export function canonicalPiqueOption(kind: PiqueKind, value: string): string | null {
  if (kind === "date") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      return null;
    }
    return value;
  }
  if (kind === "number") {
    if (!/^-?\d+$/.test(value)) return null;
    const number = Number(value);
    if (!Number.isSafeInteger(number)) return null;
    return String(number);
  }
  if (kind !== "options" || value.length < 1 || value.length > 80) return null;
  return value;
}

function optionMessage(kind: PiqueKind): string {
  if (kind === "date") return "Cada opción de fecha debe usar el formato AAAA-MM-DD.";
  if (kind === "number") return "Cada opción numérica debe ser un entero.";
  return "Añade entre 2 y 12 opciones.";
}
