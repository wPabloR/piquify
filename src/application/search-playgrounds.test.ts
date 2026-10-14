import { describe, expect, it } from "vitest";
import { searchPlaygrounds } from "@/application/search-playgrounds";
import type { UnitOfWork } from "@/application/ports";

describe("searchPlaygrounds", () => {
  it("no busca con menos de dos caracteres", async () => {
    const uow = {
      async searchPlaygrounds() {
        throw new Error("no debería consultar");
      },
    } as unknown as UnitOfWork;
    await expect(searchPlaygrounds(uow, { actorId: "x", query: "a" })).resolves.toEqual([]);
  });
});
