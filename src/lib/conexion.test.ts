import { describe, expect, it } from "vitest";
import { formatoFecha, resumenSemana, textoReporte, type PersonaReporte } from "./conexion";

const lunes = new Date("2026-08-31T00:00:00.000Z");
const d = (s: string) => new Date(`${s}T00:00:00.000Z`);

function p(
  fecha: string,
  encuentro: string,
  categoria: string,
  origen: string,
  extra: Partial<PersonaReporte> = {}
): PersonaReporte {
  return { fechaLlegada: d(fecha), encuentro, categoria, origen, campus: "CPA", paso1At: null, paso2At: null, ...extra };
}

// Datos del reporte real de ejemplo: jueves 3 (0H, 2M, 0J, 1N) y domingo 6.
const personas: PersonaReporte[] = [
  p("2026-09-03", "JUEVES", "MUJER", "RRSS"),
  p("2026-09-03", "JUEVES", "MUJER", "RRSS"),
  p("2026-09-03", "JUEVES", "NINO", "AMIGOS_FAMILIA"),
  p("2026-09-06", "DOMINGO_AM", "HOMBRE", "RRSS"),
  p("2026-09-06", "DOMINGO_AM", "HOMBRE", "RRSS"),
  ...Array.from({ length: 5 }, () => p("2026-09-06", "DOMINGO_AM", "MUJER", "AMIGOS_FAMILIA")),
  ...Array.from({ length: 4 }, () => p("2026-09-06", "DOMINGO_PM", "MUJER", "RRSS")),
  ...Array.from({ length: 3 }, () => p("2026-09-06", "DOMINGO_PM", "NINO", "RRSS")),
];

describe("resumenSemana", () => {
  const r = resumenSemana(personas, lunes);
  it("cuenta el total y por encuentro", () => {
    expect(r.total).toBe(17);
    expect(r.encuentros.map((e) => e.total)).toEqual([3, 7, 7]);
  });
  it("cuenta por categoría", () => {
    expect(r.encuentros[0].porCategoria).toEqual({ HOMBRE: 0, MUJER: 2, JOVEN: 0, NINO: 1 });
    expect(r.encuentros[1].porCategoria.MUJER).toBe(5);
  });
  it("ignora personas de otras semanas", () => {
    const otra = resumenSemana([...personas, p("2026-09-10", "JUEVES", "HOMBRE", "OTRO")], lunes);
    expect(otra.total).toBe(17);
  });
  it("cuenta pasos por la fecha en que ocurrieron", () => {
    const con = [
      p("2026-08-20", "JUEVES", "HOMBRE", "RRSS", { paso1At: d("2026-09-06") }),
      p("2026-09-06", "DOMINGO_AM", "MUJER", "RRSS", { paso1At: d("2026-09-06"), paso2At: d("2026-09-13") }),
    ];
    const s = resumenSemana(con, lunes);
    expect(s.paso1).toBe(2);
    expect(s.paso2).toBe(0);
  });
});

describe("textoReporte", () => {
  const texto = textoReporte({ campus: "CPA", lunes, personas, lideres: "Líderes de prueba" });
  it("incluye fechas, totales y líderes", () => {
    expect(texto).toContain("Fecha: 03/09/2026");
    expect(texto).toContain("Fecha: 06/09/2026");
    expect(texto).toContain("Total nuevos asistentes: 17");
    expect(texto).toContain("*TOTAL SEMANA:* 17");
    expect(texto).toContain("Líderes de prueba");
  });
  it("muestra guion cuando no hay paso 2", () => {
    expect(texto).toContain("Asistentes experiencia paso 2: -");
  });
  it("formatea fechas dd/mm/yyyy", () => {
    expect(formatoFecha(d("2026-01-05"))).toBe("05/01/2026");
  });
});
