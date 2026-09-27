"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { esAdmin } from "@/lib/constants";
import { registrarAuditoria } from "@/lib/audit";
import { guardarRespaldo } from "@/lib/respaldo";
import type { ActionState } from "@/lib/actions";

export async function crearRespaldoAction(): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || !esAdmin(user.rol)) return { error: "Solo un administrador o pastor." };
  try {
    const r = await guardarRespaldo("manual");
    await registrarAuditoria(user, "respaldo.manual", r.pathname);
    revalidatePath("/admin/respaldos");
    return { ok: "Respaldo creado." };
  } catch {
    return { error: "No se pudo crear el respaldo. Intenta de nuevo en unos minutos." };
  }
}
