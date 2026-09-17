import { describe, expect, it } from "vitest";
import * as contracts from "./index.js";

describe("@piquify/contracts", () => {
  it("exports an empty module ready to grow", () => {
    expect(contracts).toEqual({});
  });
});
