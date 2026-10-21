import { describe, expect, it } from "vitest";
import { safeNextPath, safeReturnPath } from "@/lib/safe-path";

describe("safeReturnPath", () => {
  it("acepta una ruta interna", () => {
    expect(safeNextPath("/playgrounds/1")).toBe("/playgrounds/1");
    expect(safeReturnPath("/playgrounds/1")).toBe("/playgrounds/1");
  });

  it("acepta el origen de producción y el de localhost", () => {
    expect(safeReturnPath("https://piquify.vercel.app/invitations")).toBe("/invitations");
    expect(safeReturnPath("http://localhost:3000/")).toBe("/");
  });

  it("rechaza otro origen y un protocolo relativo", () => {
    expect(safeReturnPath("https://evil.example/next")).toBeNull();
    expect(safeReturnPath("//evil.example")).toBeNull();
    expect(safeNextPath("https://piquify.vercel.app/")).toBeNull();
  });
});
