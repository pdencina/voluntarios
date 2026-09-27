import { describe, expect, it } from "vitest";
import { nombreRespaldo, respaldosAEliminar, rutaRespaldoValida } from "./respaldo-logica";

describe("respaldos", () => {
  it("nombra el archivo con fecha y hora de Santiago", () => {
    // 2026-09-28 09:00 UTC = 06:00 en Santiago (UTC-3)
    expect(nombreRespaldo(new Date("2026-09-28T09:00:00Z"), "automatico")).toBe(
      "respaldos/respaldo-2026-09-28_0600-automatico.xlsx"
    );
  });

  it("conserva los más recientes y marca el resto para borrar", () => {
    const lista = Array.from({ length: 15 }, (_, i) => ({
      pathname: `r${i}`,
      uploadedAt: new Date(2026, 0, i + 1),
    }));
    const borrar = respaldosAEliminar(lista, 12);
    expect(borrar.map((b) => b.pathname).sort()).toEqual(["r0", "r1", "r2"]);
    expect(respaldosAEliminar(lista.slice(0, 5), 12)).toEqual([]);
  });

  it("solo acepta rutas dentro de la carpeta de respaldos", () => {
    expect(rutaRespaldoValida("respaldos/respaldo-2026-09-28_0600-manual.xlsx")).toBe(true);
    expect(rutaRespaldoValida("otra/cosa.xlsx")).toBe(false);
    expect(rutaRespaldoValida("respaldos/../secreto.xlsx")).toBe(false);
    expect(rutaRespaldoValida(null)).toBe(false);
  });
});
