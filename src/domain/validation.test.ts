import { describe, expect, it } from "vitest";
import {
  emojiForPlayground,
  parseCreatePique,
  parseDisplayName,
  parseEmail,
  parseHandle,
  parsePassword,
  parsePlayground,
} from "@/domain/validation";

describe("parseHandle", () => {
  it("normaliza el usuario a minúsculas", () => {
    expect(parseHandle(" NuVega ")).toEqual({ ok: true, value: "nuvega" });
  });

  it("rechaza espacios y símbolos", () => {
    expect(parseHandle("nu vega")).toMatchObject({ ok: false, code: "INVALID_INPUT" });
  });
});

describe("parseEmail", () => {
  it("normaliza el correo y rechaza uno inválido", () => {
    expect(parseEmail("  Nuria@Example.COM ")).toEqual({ ok: true, value: "nuria@example.com" });
    expect(parseEmail("nuria")).toMatchObject({ ok: false, code: "INVALID_INPUT" });
  });
});

describe("parseDisplayName", () => {
  it("exige entre 2 y 60 caracteres", () => {
    expect(parseDisplayName("N")).toMatchObject({ ok: false });
    expect(parseDisplayName("  Nuria Vega  ")).toEqual({ ok: true, value: "Nuria Vega" });
  });
});

describe("parsePassword", () => {
  it("exige al menos 8 caracteres", () => {
    expect(parsePassword("corta")).toMatchObject({ ok: false });
    expect(parsePassword("segura123")).toEqual({ ok: true, value: "segura123" });
  });
});

describe("parsePlayground", () => {
  it("asigna siempre el mismo emoji del catálogo para el mismo nombre", () => {
    const first = parsePlayground({ name: " Piso del mar ", tagline: "Casa" });
    const second = parsePlayground({ name: "Piso del mar", tagline: "" });
    expect(first.ok && second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(first.value.emoji).toBe(second.value.emoji);
      expect(first.value.emoji).toBe(emojiForPlayground("piso del mar"));
      expect(first.value.name).toBe("Piso del mar");
    }
  });
});

describe("parseCreatePique", () => {
  const now = new Date("2026-10-13T12:00:00Z");

  it("acepta una pregunta con dos opciones y cierre futuro", () => {
    const result = parseCreatePique({
      question: "¿Quién llega tarde?",
      detail: "",
      kind: "options",
      stake: 80,
      closesAt: "2026-10-14T12:00:00Z",
      options: [" Ana ", "Luis"],
      now,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.options).toEqual(["Ana", "Luis"]);
      expect(result.value.detail).toBeNull();
    }
  });

  it("rechaza opciones repetidas y un stake decimal", () => {
    expect(
      parseCreatePique({
        question: "¿Quién llega tarde?",
        detail: "",
        kind: "options",
        stake: 10.5,
        closesAt: "2026-10-14T12:00:00Z",
        options: ["Ana", "ana"],
        now,
      }).ok,
    ).toBe(false);
  });

  it("exige fechas reales cuando el tipo es fecha", () => {
    const accepted = parseCreatePique({
      question: "¿Qué día llega?",
      detail: "",
      kind: "date",
      stake: 20,
      closesAt: "2026-10-14T12:00:00Z",
      options: ["2026-10-20", "2024-02-29"],
      now,
    });
    expect(accepted.ok).toBe(true);
    if (accepted.ok) expect(accepted.value.options).toEqual(["2026-10-20", "2024-02-29"]);

    expect(
      parseCreatePique({
        question: "¿Qué día llega?",
        detail: "",
        kind: "date",
        stake: 20,
        closesAt: "2026-10-14T12:00:00Z",
        options: ["2026-10-20", "mañana"],
        now,
      }).ok,
    ).toBe(false);
  });

  it("exige enteros cuando el tipo es número", () => {
    const accepted = parseCreatePique({
      question: "¿Cuántos días?",
      detail: "",
      kind: "number",
      stake: 20,
      closesAt: "2026-10-14T12:00:00Z",
      options: ["007", "-3"],
      now,
    });
    expect(accepted.ok).toBe(true);
    if (accepted.ok) expect(accepted.value.options).toEqual(["7", "-3"]);

    expect(
      parseCreatePique({
        question: "¿Cuántos días?",
        detail: "",
        kind: "number",
        stake: 20,
        closesAt: "2026-10-14T12:00:00Z",
        options: ["1", "1.5"],
        now,
      }).ok,
    ).toBe(false);
  });
});
