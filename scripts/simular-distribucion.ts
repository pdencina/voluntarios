/**
 * Simulación (solo lectura): usa los voluntarios reales con una disponibilidad ALEATORIA en memoria
 * para comprobar cómo se comporta el motor de distribución. No escribe nada en la base.
 *   npx tsx scripts/simular-distribucion.ts [probabilidadDisponible=0.6]
 */
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { distribuirEncuentro, type OtroEncuentroAlg, type PuestoAlg, type VoluntarioAlg } from "../src/lib/distribucion";
import { inferirGenero } from "../src/lib/logica";

config({ path: ".env.local", quiet: true });
const sql = neon(process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL!);
const prob = Number(process.argv[2] ?? 0.6);

const ENCUENTROS = ["JUEVES", "DOMINGO_AM", "DOMINGO_PM"];

function rng(seed: number) {
  let s = seed;
  return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
}

async function main() {
  const [areas, puestos, vols, membresias, rot] = await Promise.all([
    sql`SELECT * FROM "AreaServicio" ORDER BY orden`,
    sql`SELECT * FROM "PuestoServicio" ORDER BY orden`,
    sql`SELECT id, nombre FROM "Voluntario" WHERE activo = true AND id NOT LIKE 'demo-%'`,
    sql`SELECT "voluntarioId", "equipoId" FROM "VoluntarioEquipo"`,
    sql`SELECT id FROM "Equipo" WHERE tipo = 'ROTATIVO'`,
  ]);
  const rotativos = rot.map((r) => r.id as string);
  const equiposDe = new Map<string, string[]>();
  for (const m of membresias) {
    const k = m.voluntarioId as string;
    equiposDe.set(k, [...(equiposDe.get(k) ?? []), m.equipoId as string]);
  }
  const volsAlg: VoluntarioAlg[] = vols.map((v) => ({
    id: v.id as string,
    nombre: v.nombre as string,
    equipoIds: equiposDe.get(v.id as string) ?? [],
    genero: inferirGenero(v.nombre as string),
  }));

  const r = rng(42);
  const disp: Record<string, Set<string>> = Object.fromEntries(ENCUENTROS.map((e) => [e, new Set<string>()]));
  for (const v of volsAlg) for (const e of ENCUENTROS) if (r() < prob) disp[e].add(v.id);

  const nombrePuesto = new Map(puestos.map((p) => [p.id as string, p.nombre as string]));
  const areaDe = new Map(puestos.map((p) => [p.id as string, p.areaId as string]));
  const otros: OtroEncuentroAlg[] = [];
  const porVol = new Map(volsAlg.map((v) => [v.id, v]));

  console.log(`Simulación con ${volsAlg.length} voluntarios reales, probabilidad de estar disponible ${prob}\n`);

  for (const enc of ENCUENTROS) {
    const puestosAlg: PuestoAlg[] = puestos
      .filter((p) => (p.encuentros as string).split(",").includes(enc))
      .map((p) => {
        const a = areas.find((x) => x.id === p.areaId)!;
        return {
          id: p.id as string,
          areaId: a.id as string,
          areaNombre: a.nombre as string,
          nombre: p.nombre as string,
          cupos: p.cupos as number,
          rota: p.rota as boolean,
          genero: (p.genero as string) ?? null,
          general: a.general as boolean,
          elegibleEquipoIds: p.equipoId ? [p.equipoId as string] : a.equipoId ? [a.equipoId as string] : a.general ? rotativos : [],
        };
      });
    const res = distribuirEncuentro({
      encuentro: enc,
      puestos: puestosAlg,
      disponibles: volsAlg.filter((v) => disp[enc].has(v.id)),
      fijas: [],
      otros: otros.filter((o) => o.encuentro !== enc),
      historial: {},
    });
    const total = puestosAlg.reduce((s, p) => s + p.cupos, 0);
    const repiten = res.asignaciones.filter((a) => a.motivos.some((m) => m.startsWith("⚠"))).length;
    console.log(`${enc}: ${res.asignaciones.length}/${total} puestos cubiertos · ${disp[enc].size} disponibles · ${res.sinPuesto.length} sin puesto · ${repiten} repiten`);
    for (const av of res.avisos) console.log("   -", av);
    for (const a of res.asignaciones) {
      otros.push({
        encuentro: enc,
        puestoId: a.puestoId,
        puestoNombre: nombrePuesto.get(a.puestoId) ?? "",
        areaId: areaDe.get(a.puestoId) as string,
        voluntarioId: a.voluntarioId,
      });
    }
    if (enc === "JUEVES") {
      console.log("   Ejemplo:");
      for (const a of res.asignaciones.slice(0, 6)) {
        console.log(`     ${nombrePuesto.get(a.puestoId)}: ${porVol.get(a.voluntarioId)?.nombre}  [${a.motivos.join(" | ")}]`);
      }
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
