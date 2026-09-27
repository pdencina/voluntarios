import { describe, expect, it } from "vitest";
import { cumpleEnSemana, deficitArea, edadAl, encuentrosDelDia, rachaSinResponder } from "./semana";

const d = (s: string) => new Date(`${s}T00:00:00.000Z`);
const lunes = d("2026-09-28");

describe("encuentrosDelDia", () => {
  it("jueves y domingo tienen sus encuentros; otros días ninguno", () => {
    expect(encuentrosDelDia(lunes, "2026-10-01")).toEqual(["JUEVES"]);
    expect(encuentrosDelDia(lunes, "2026-10-04")).toEqual(["DOMINGO_AM", "DOMINGO_PM"]);
    expect(encuentrosDelDia(lunes, "2026-09-29")).toEqual([]);
  });
});

describe("cumpleEnSemana", () => {
  it("encuentra el día del cumpleaños dentro de la semana", () => {
    expect(cumpleEnSemana(d("1990-10-02"), lunes)?.toISOString().slice(0, 10)).toBe("2026-10-02");
    expect(cumpleEnSemana(d("1985-10-06"), lunes)).toBeNull();
  });
  it("funciona cuando la semana cruza de año", () => {
    expect(cumpleEnSemana(d("2000-01-02"), d("2026-12-28"))?.toISOString().slice(0, 10)).toBe("2027-01-02");
  });
  it("los nacidos un 29 de febrero celebran el 28 en años no bisiestos", () => {
    expect(cumpleEnSemana(d("2000-02-29"), d("2027-02-22"))?.toISOString().slice(0, 10)).toBe("2027-02-28");
    expect(cumpleEnSemana(d("2000-02-29"), d("2028-02-28"))?.toISOString().slice(0, 10)).toBe("2028-02-29");
  });
});

describe("edadAl", () => {
  it("calcula la edad cumplida", () => {
    expect(edadAl(d("1990-10-02"), d("2026-10-02"))).toBe(36);
    expect(edadAl(d("1990-10-02"), d("2026-10-01"))).toBe(35);
  });
});

describe("rachaSinResponder", () => {
  it("cuenta semanas seguidas sin responder desde la más reciente", () => {
    expect(rachaSinResponder([false, false, false, true])).toBe(3);
    expect(rachaSinResponder([true, false, false])).toBe(0);
    expect(rachaSinResponder([])).toBe(0);
  });
});

describe("deficitArea", () => {
  it("no es negativo", () => {
    expect(deficitArea(4, 1)).toBe(3);
    expect(deficitArea(2, 5)).toBe(0);
  });
});
