import { describe, expect, it } from "vitest";
import {
  activityHref,
  authFormSnapshot,
  credentialFailure,
  isUnconfirmedEmail,
  ledgerMovementLabel,
  parseLedgerKind,
  optionShare,
  piqueFilterForHash,
} from "@/domain/presentation";

describe("authFormSnapshot", () => {
  it("conserva valores no sensibles y omite la contraseña", () => {
    const snapshot = authFormSnapshot({
      name: "Nuria Vega",
      handle: "nuria",
      email: "nuria@example.com",
      password: "secreta123",
      errors: { handle: "El usuario debe tener 3–24 caracteres: letras, números o _." },
    });
    expect(snapshot.values).toEqual({
      name: "Nuria Vega",
      handle: "nuria",
      email: "nuria@example.com",
    });
    expect(snapshot.values).not.toHaveProperty("password");
    expect(snapshot.fieldErrors.handle).toBeDefined();
  });

  it("marca correo y contraseña juntos cuando fallan las credenciales", () => {
    const snapshot = credentialFailure("nuria@example.com");
    expect(snapshot.values).toEqual({ email: "nuria@example.com" });
    expect(snapshot.fieldErrors.email).toBe(snapshot.fieldErrors.password);
    expect(snapshot.error).toBe(snapshot.fieldErrors.email);
  });

  it("reconoce una cuenta pendiente de confirmar", () => {
    expect(isUnconfirmedEmail({ code: "email_not_confirmed" })).toBe(true);
    expect(isUnconfirmedEmail({ message: "Email not confirmed" })).toBe(true);
    expect(isUnconfirmedEmail({ message: "Invalid login credentials" })).toBe(false);
  });
});

describe("activityHref", () => {
  it("lleva invitaciones y solicitudes a la bandeja de acceso", () => {
    expect(activityHref({ kind: "invitation", playgroundId: "pg", piqueId: null })).toBe(
      "/invitations",
    );
    expect(activityHref({ kind: "join_request", playgroundId: "pg", piqueId: null })).toBe(
      "/invitations",
    );
    expect(activityHref({ kind: "friend_request", playgroundId: null, piqueId: null })).toBe(
      "/invitations",
    );
  });

  it("ancla los avisos de pique al pique concreto", () => {
    expect(
      activityHref({
        kind: "vote_open",
        playgroundId: "pg",
        piqueId: "pq",
      }),
    ).toBe("/playgrounds/pg#pique-pq");
  });

  it("abre la pestaña del pique anclado", () => {
    expect(
      piqueFilterForHash([{ id: "pq", status: "resolved" }], "#pique-pq"),
    ).toBe("resolved");
    expect(piqueFilterForHash([{ id: "pq", status: "open" }], "#otro")).toBe("open");
  });
});

describe("ledgerMovementLabel", () => {
  it("nombra cada movimiento en primera persona", () => {
    expect(ledgerMovementLabel("opening_balance")).toBe("Saldo inicial");
    expect(ledgerMovementLabel("stake_hold")).toBe("Stake puesto en juego");
    expect(ledgerMovementLabel("stake_refund")).toBe("Stake devuelto");
    expect(ledgerMovementLabel("payout")).toBe("Premio");
  });

  it("rechaza un tipo de movimiento desconocido", () => {
    expect(() => parseLedgerKind("bonus")).toThrow("INVALID_RESPONSE");
  });
});

describe("optionShare", () => {
  it("oculta el porcentaje hasta que el pique está resuelto", () => {
    expect(optionShare("open", 1, 2)).toBeNull();
    expect(optionShare("pending_result", 2, 2)).toBeNull();
    expect(optionShare("resolved", 1, 2)).toBe(50);
    expect(optionShare("resolved", 0, 0)).toBe(0);
  });
});
