import { describe, expect, it } from "vitest";
import {
  asignacionMinima,
  distribuirEncuentro,
  type EntradaDistribucion,
  type PuestoAlg,
  type VoluntarioAlg,
} from "./distribucion";

const vol = (id: string, equipos: string[], genero: string | null = null): VoluntarioAlg => ({
  id,
  nombre: id,
  equipoIds: equipos,
  genero,
});
const puesto = (id: string, extra: Partial<PuestoAlg> = {}): PuestoAlg => ({
  id,
  areaId: "area-" + id,
  areaNombre: "Área " + id,
  nombre: id,
  cupos: 1,
  rota: true,
  genero: null,
  elegibleEquipoIds: ["ROT"],
  general: true,
  ...extra,
});
const base = (e: Partial<EntradaDistribucion>): EntradaDistribucion => ({
  encuentro: "JUEVES",
  puestos: [],
  disponibles: [],
  fijas: [],
  otros: [],
  historial: {},
  ...e,
});
const de = (r: ReturnType<typeof distribuirEncuentro>, puestoId: string) =>
  r.asignaciones.filter((a) => a.puestoId === puestoId).map((a) => a.voluntarioId);

describe("asignacionMinima", () => {
  it("encuentra el emparejamiento de menor costo", () => {
    expect(asignacionMinima([[4, 1, 3], [2, 0, 5], [3, 2, 2]])).toEqual([1, 0, 2]);
  });
});

describe("distribuirEncuentro", () => {
  it("llena los puestos con los disponibles y nadie se repite", () => {
    const r = distribuirEncuentro(
      base({
        puestos: [puesto("A"), puesto("B", { cupos: 2 })],
        disponibles: [vol("x", ["ROT"]), vol("y", ["ROT"]), vol("z", ["ROT"]), vol("w", ["ROT"])],
      })
    );
    const ids = r.asignaciones.map((a) => a.voluntarioId);
    expect(ids).toHaveLength(3);
    expect(new Set(ids).size).toBe(3);
    expect(r.sinPuesto).toHaveLength(1);
  });

  it("rota: no repite el puesto de otro encuentro si hay alternativa", () => {
    const r = distribuirEncuentro(
      base({
        encuentro: "DOMINGO_AM",
        puestos: [puesto("A"), puesto("B")],
        disponibles: [vol("x", ["ROT"]), vol("y", ["ROT"])],
        otros: [
          { encuentro: "JUEVES", puestoId: "A", puestoNombre: "A", areaId: "area-A", voluntarioId: "x" },
          { encuentro: "JUEVES", puestoId: "B", puestoNombre: "B", areaId: "area-B", voluntarioId: "y" },
        ],
      })
    );
    expect(de(r, "A")).toEqual(["y"]);
    expect(de(r, "B")).toEqual(["x"]);
  });

  it("si no hay alternativa, repite antes de dejar vacío y lo avisa", () => {
    const r = distribuirEncuentro(
      base({
        encuentro: "DOMINGO_AM",
        puestos: [puesto("A")],
        disponibles: [vol("x", ["ROT"])],
        otros: [{ encuentro: "JUEVES", puestoId: "A", puestoNombre: "A", areaId: "area-A", voluntarioId: "x" }],
      })
    );
    expect(de(r, "A")).toEqual(["x"]);
    expect(r.asignaciones[0].motivos.join(" ")).toContain("Repite este puesto");
    expect(r.avisos.join(" ")).toContain("repite");
  });

  it("solo usa a quienes están disponibles (los demás no entran)", () => {
    const r = distribuirEncuentro(
      base({ puestos: [puesto("A")], disponibles: [] })
    );
    expect(r.asignaciones).toHaveLength(0);
    expect(r.vacios).toHaveLength(1);
  });

  it("áreas especializadas solo con voluntarios de su equipo", () => {
    const seg = puesto("Seg", { elegibleEquipoIds: ["SEG"], general: false });
    const r = distribuirEncuentro(
      base({ puestos: [seg], disponibles: [vol("rot", ["ROT"]), vol("seg1", ["SEG"])] })
    );
    expect(de(r, "Seg")).toEqual(["seg1"]);
    const sinEquipo = distribuirEncuentro(base({ puestos: [seg], disponibles: [vol("rot", ["ROT"])] }));
    expect(sinEquipo.vacios).toHaveLength(1);
  });

  it("apoyo de otros equipos en áreas generales solo si hace falta", () => {
    const r = distribuirEncuentro(
      base({
        puestos: [puesto("A", { cupos: 2 })],
        disponibles: [vol("rot", ["ROT"]), vol("kids", ["KIDS"])],
      })
    );
    expect(de(r, "A").sort()).toEqual(["kids", "rot"]);
    const r2 = distribuirEncuentro(
      base({ puestos: [puesto("A")], disponibles: [vol("rot", ["ROT"]), vol("kids", ["KIDS"])] })
    );
    expect(de(r2, "A")).toEqual(["rot"]);
  });

  it("respeta el género del puesto", () => {
    const r = distribuirEncuentro(
      base({
        puestos: [puesto("BañoM", { genero: "F" })],
        disponibles: [vol("h", ["ROT"], "M"), vol("s", ["ROT"], null), vol("m", ["ROT"], "F")],
      })
    );
    expect(de(r, "BañoM")).toEqual(["m"]);
  });

  it("conserva las asignaciones fijas y no reutiliza a esa persona", () => {
    const r = distribuirEncuentro(
      base({
        puestos: [puesto("A"), puesto("B")],
        disponibles: [vol("x", ["ROT"]), vol("y", ["ROT"])],
        fijas: [{ puestoId: "A", slot: 0, voluntarioId: "x" }],
      })
    );
    expect(de(r, "A")).toEqual([]);
    expect(de(r, "B")).toEqual(["y"]);
  });

  it("puesto no rotativo mantiene a la misma persona", () => {
    const r = distribuirEncuentro(
      base({
        encuentro: "DOMINGO_PM",
        puestos: [puesto("Enc", { rota: false })],
        disponibles: [vol("x", ["ROT"]), vol("y", ["ROT"])],
        otros: [{ encuentro: "JUEVES", puestoId: "Enc", puestoNombre: "Enc", areaId: "area-Enc", voluntarioId: "y" }],
      })
    );
    expect(de(r, "Enc")).toEqual(["y"]);
  });

  it("evita a quien ya sirvió mucho en ese puesto en semanas anteriores", () => {
    const r = distribuirEncuentro(
      base({
        puestos: [puesto("A")],
        disponibles: [vol("x", ["ROT"]), vol("y", ["ROT"])],
        historial: { x: { A: 4 } },
      })
    );
    expect(de(r, "A")).toEqual(["y"]);
  });

  it("prioriza llenar áreas especializadas cuando faltan personas", () => {
    const kids = puesto("Kids", { elegibleEquipoIds: ["KIDS"], general: false });
    const gen = puesto("Gen");
    const r = distribuirEncuentro(
      base({ puestos: [kids, gen], disponibles: [vol("k1", ["KIDS"])] })
    );
    expect(de(r, "Kids")).toEqual(["k1"]);
    expect(r.vacios.map((v) => v.puestoId)).toEqual(["Gen"]);
  });
});
