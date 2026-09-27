import { beforeAll, describe, expect, it } from "vitest";

beforeAll(() => {
  process.env.SESSION_SECRET = "secreto-de-prueba";
});

describe("firma del link de reunión", () => {
  it("valida la firma correcta y rechaza cualquier otra", async () => {
    const { firmaReunion, firmaValida } = await import("./reunion");
    const f = firmaReunion("semana1", "equipoA");
    expect(firmaValida("semana1", "equipoA", f)).toBe(true);
    expect(firmaValida("semana1", "equipoB", f)).toBe(false); // otro equipo
    expect(firmaValida("semana2", "equipoA", f)).toBe(false); // otra semana
    expect(firmaValida("semana1", "equipoA", "x".repeat(f.length))).toBe(false);
    expect(firmaValida("semana1", "equipoA", undefined)).toBe(false);
    expect(firmaValida("semana1", "equipoA", "corta")).toBe(false);
  });
  it("arma el enlace con la firma", async () => {
    const { enlaceReunion, firmaReunion } = await import("./reunion");
    expect(enlaceReunion("https://x.app", "s", "e")).toBe(`https://x.app/reunion/s/e?f=${firmaReunion("s", "e")}`);
  });
});
