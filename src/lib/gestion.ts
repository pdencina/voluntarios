"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  createSession,
  getCurrentUser,
  hashPassword,
  verifyPassword,
  type CurrentUser,
} from "@/lib/auth";
import { registrarAuditoria } from "@/lib/audit";
import { normalizarNombre } from "@/lib/normalize";
import { calcularMembresias } from "@/lib/logica";
import type { ActionState } from "@/lib/actions";
import { RUTA_ROLES, esAdmin, puedeEditar, type RolUsuario } from "@/lib/constants";

async function exigirUsuario(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Sesión expirada.");
  return user;
}

async function exigirAdmin(): Promise<CurrentUser> {
  const user = await exigirUsuario();
  if (!esAdmin(user.rol)) throw new Error("Solo un administrador.");
  return user;
}

async function exigirEditor(): Promise<CurrentUser> {
  const user = await exigirUsuario();
  if (!puedeEditar(user.rol)) throw new Error("Tu rol es de solo consulta.");
  return user;
}

function permitidos(user: CurrentUser): string[] | "todos" {
  return esAdmin(user.rol) ? "todos" : user.equipoIds;
}

// ---------- Voluntarios ----------

const camposVoluntario = {
  nombre: z.string().trim().min(1, "El nombre es obligatorio."),
  telefono: z.string().trim().optional(),
  correo: z
    .string()
    .trim()
    .refine((v) => v === "" || z.string().email().safeParse(v).success, "Correo inválido.")
    .optional(),
  fechaNacimiento: z.string().trim().optional(),
  observaciones: z.string().trim().optional(),
  genero: z.enum(["", "F", "M"]).optional(),
};

function leerCampos(formData: FormData) {
  return {
    nombre: formData.get("nombre"),
    telefono: formData.get("telefono") ?? "",
    correo: formData.get("correo") ?? "",
    fechaNacimiento: formData.get("fechaNacimiento") ?? "",
    observaciones: formData.get("observaciones") ?? "",
    genero: formData.get("genero") ?? "",
  };
}

function parseFecha(valor: string | undefined): Date | null | "invalida" {
  if (!valor) return null;
  const f = new Date(`${valor}T00:00:00.000Z`);
  return Number.isNaN(f.getTime()) ? "invalida" : f;
}

export async function crearVoluntarioAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await exigirEditor();
  const parsed = z.object(camposVoluntario).safeParse(leerCampos(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const d = parsed.data;

  const permitidosIds = permitidos(user);
  const equipoIds = formData
    .getAll("equipoIds")
    .map(String)
    .filter((id) => permitidosIds === "todos" || permitidosIds.includes(id));
  if (equipoIds.length === 0) return { error: "Selecciona al menos un equipo." };

  const fecha = parseFecha(d.fechaNacimiento);
  if (fecha === "invalida") return { error: "Fecha inválida." };

  const normalizado = normalizarNombre(d.nombre);
  const existente = await prisma.voluntario.findFirst({
    where: { nombreNormalizado: normalizado },
  });
  if (existente) {
    return {
      error: `Ya existe un voluntario llamado "${existente.nombre}". Búscalo y agrégalo a tu equipo desde su ficha.`,
    };
  }

  const creado = await prisma.voluntario.create({
    data: {
      nombre: d.nombre,
      nombreNormalizado: normalizado,
      telefono: d.telefono || null,
      correo: d.correo || null,
      fechaNacimiento: fecha,
      observaciones: d.observaciones || null,
      genero: d.genero || null,
      equipos: { create: equipoIds.map((equipoId) => ({ equipoId })) },
    },
  });
  await registrarAuditoria(user, "voluntario.crear", d.nombre);

  revalidatePath("/voluntarios");
  redirect(`/voluntarios/${encodeURIComponent(creado.id)}`);
}

export async function actualizarVoluntarioAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await exigirEditor();
  const id = String(formData.get("id") ?? "");
  const parsed = z.object(camposVoluntario).safeParse(leerCampos(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const d = parsed.data;

  const voluntario = await prisma.voluntario.findUnique({
    where: { id },
    include: { equipos: { select: { equipoId: true } } },
  });
  if (!voluntario) return { error: "Voluntario no encontrado." };

  const actuales = voluntario.equipos.map((e) => e.equipoId);
  const permite = permitidos(user);
  if (permite !== "todos" && !actuales.some((e) => permite.includes(e))) {
    return { error: "No tienes permiso para editar este voluntario." };
  }

  const fecha = parseFecha(d.fechaNacimiento);
  if (fecha === "invalida") return { error: "Fecha inválida." };

  const deseados = formData.getAll("equipoIds").map(String);
  const { agregar, quitar } = calcularMembresias(actuales, deseados, permite);
  if (actuales.length + agregar.length - quitar.length < 1) {
    return {
      error: "El voluntario debe pertenecer al menos a un equipo. Si ya no sirve, desactívalo.",
    };
  }

  const normalizado = normalizarNombre(d.nombre);
  const duplicado = await prisma.voluntario.findFirst({
    where: { nombreNormalizado: normalizado, NOT: { id } },
  });
  if (duplicado) {
    return { error: `Ya existe otro voluntario llamado "${duplicado.nombre}".` };
  }

  await prisma.$transaction([
    prisma.voluntario.update({
      where: { id },
      data: {
        nombre: d.nombre,
        nombreNormalizado: normalizado,
        telefono: d.telefono || null,
        correo: d.correo || null,
        fechaNacimiento: fecha,
        fechaNacimientoRaw: fecha ? null : voluntario.fechaNacimientoRaw,
        observaciones: d.observaciones || null,
        genero: d.genero || null,
      },
    }),
    prisma.voluntarioEquipo.deleteMany({
      where: { voluntarioId: id, equipoId: { in: quitar } },
    }),
    prisma.voluntarioEquipo.createMany({
      data: agregar.map((equipoId) => ({ voluntarioId: id, equipoId })),
    }),
  ]);
  await registrarAuditoria(
    user,
    "voluntario.editar",
    `${d.nombre} (+${agregar.length} / -${quitar.length} equipos)`
  );

  revalidatePath("/voluntarios");
  revalidatePath(`/voluntarios/${id}`);
  redirect(`/voluntarios/${encodeURIComponent(id)}`);
}

export async function alternarActivoVoluntarioAction(formData: FormData) {
  const user = await exigirEditor();
  const id = String(formData.get("id") ?? "");
  const v = await prisma.voluntario.findUnique({
    where: { id },
    include: { equipos: { select: { equipoId: true } } },
  });
  if (!v) throw new Error("Voluntario no encontrado.");
  const permite = permitidos(user);
  if (permite !== "todos" && !v.equipos.some((e) => permite.includes(e.equipoId))) {
    throw new Error("Sin permiso.");
  }
  await prisma.voluntario.update({ where: { id }, data: { activo: !v.activo } });
  await registrarAuditoria(user, v.activo ? "voluntario.desactivar" : "voluntario.reactivar", v.nombre);
  revalidatePath("/voluntarios");
  revalidatePath(`/voluntarios/${id}`);
}

export async function fusionarVoluntariosAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await exigirAdmin();
  const conservarId = String(formData.get("conservarId") ?? "");
  const eliminarId = String(formData.get("eliminarId") ?? "");
  if (!conservarId || !eliminarId || conservarId === eliminarId) {
    return { error: "Elige dos voluntarios distintos." };
  }

  const [a, b] = await Promise.all([
    prisma.voluntario.findUnique({
      where: { id: conservarId },
      include: { equipos: true, respuestas: true },
    }),
    prisma.voluntario.findUnique({
      where: { id: eliminarId },
      include: { equipos: true, respuestas: true },
    }),
  ]);
  if (!a || !b) return { error: "Voluntario no encontrado." };

  const equiposA = new Set(a.equipos.map((e) => e.equipoId));
  const equiposNuevos = b.equipos.filter((e) => !equiposA.has(e.equipoId));
  const respuestasA = new Map(a.respuestas.map((r) => [r.semanaId, r]));

  const ops = [];
  for (const r of b.respuestas) {
    const existente = respuestasA.get(r.semanaId);
    if (!existente) {
      ops.push(
        prisma.respuesta.update({ where: { id: r.id }, data: { voluntarioId: a.id } })
      );
    } else if (existente.respondidoAt === null && r.respondidoAt !== null) {
      ops.push(
        prisma.respuesta.update({
          where: { id: existente.id },
          data: {
            disponibleJueves: r.disponibleJueves,
            disponibleDomingoAM: r.disponibleDomingoAM,
            disponibleDomingoPM: r.disponibleDomingoPM,
            respondidoAt: r.respondidoAt,
          },
        })
      );
    }
  }

  const observaciones = [a.observaciones, b.observaciones]
    .filter((o, i, arr) => o && arr.indexOf(o) === i)
    .join(" — ");

  await prisma.$transaction([
    ...ops,
    prisma.respuesta.deleteMany({
      where: { voluntarioId: b.id, semanaId: { in: [...respuestasA.keys()] } },
    }),
    prisma.voluntarioEquipo.createMany({
      data: equiposNuevos.map((e) => ({ voluntarioId: a.id, equipoId: e.equipoId })),
    }),
    prisma.voluntario.update({
      where: { id: a.id },
      data: {
        telefono: a.telefono ?? b.telefono,
        correo: a.correo ?? b.correo,
        fechaNacimiento: a.fechaNacimiento ?? b.fechaNacimiento,
        fechaNacimientoRaw: a.fechaNacimientoRaw ?? b.fechaNacimientoRaw,
        observaciones: observaciones || null,
      },
    }),
    prisma.voluntario.delete({ where: { id: b.id } }),
  ]);
  await registrarAuditoria(user, "voluntario.fusionar", `"${b.nombre}" → "${a.nombre}"`);

  revalidatePath("/voluntarios");
  redirect(`/voluntarios/${encodeURIComponent(a.id)}`);
}

// ---------- Equipos (admin) ----------

const equipoSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio."),
  tipo: z.enum(["MINISTERIO", "ROTATIVO"]),
  liderNombre: z.string().trim().optional(),
  liderContacto: z.string().trim().optional(),
});

export async function crearEquipoAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await exigirAdmin();
  const parsed = equipoSchema.safeParse({
    nombre: formData.get("nombre"),
    tipo: formData.get("tipo"),
    liderNombre: formData.get("liderNombre") ?? "",
    liderContacto: formData.get("liderContacto") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const d = parsed.data;
  if (await prisma.equipo.findUnique({ where: { nombre: d.nombre } })) {
    return { error: "Ya existe un equipo con ese nombre." };
  }
  const eq = await prisma.equipo.create({
    data: {
      nombre: d.nombre,
      tipo: d.tipo,
      liderNombre: d.liderNombre || null,
      liderContacto: d.liderContacto || null,
    },
  });
  await registrarAuditoria(user, "equipo.crear", d.nombre);
  revalidatePath("/equipos");
  redirect(`/equipos/${eq.id}`);
}

export async function actualizarEquipoAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await exigirAdmin();
  const id = String(formData.get("id") ?? "");
  const parsed = equipoSchema.safeParse({
    nombre: formData.get("nombre"),
    tipo: formData.get("tipo"),
    liderNombre: formData.get("liderNombre") ?? "",
    liderContacto: formData.get("liderContacto") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const d = parsed.data;
  const otro = await prisma.equipo.findFirst({ where: { nombre: d.nombre, NOT: { id } } });
  if (otro) return { error: "Ya existe otro equipo con ese nombre." };
  await prisma.equipo.update({
    where: { id },
    data: {
      nombre: d.nombre,
      tipo: d.tipo,
      liderNombre: d.liderNombre || null,
      liderContacto: d.liderContacto || null,
    },
  });
  await registrarAuditoria(user, "equipo.editar", d.nombre);
  revalidatePath("/equipos");
  redirect(`/equipos/${id}`);
}

export async function eliminarEquipoAction(formData: FormData) {
  const user = await exigirAdmin();
  const id = String(formData.get("id") ?? "");
  const eq = await prisma.equipo.findUnique({
    where: { id },
    include: { _count: { select: { voluntarios: true } } },
  });
  if (!eq) throw new Error("Equipo no encontrado.");
  if (eq._count.voluntarios > 0) {
    throw new Error("El equipo aún tiene voluntarios. Muévelos antes de eliminarlo.");
  }
  await prisma.equipo.delete({ where: { id } });
  await registrarAuditoria(user, "equipo.eliminar", eq.nombre);
  revalidatePath("/equipos");
  redirect("/equipos");
}

// ---------- Usuarios (admin) ----------

async function contarAdmins() {
  return prisma.usuario.count({ where: { rol: { in: ["ADMIN", "PASTOR_CAMPUS"] } } });
}

const crearUsuarioSchema = z.object({
  nombre: z.string().trim().min(1),
  email: z.string().trim().email(),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
  rol: z.enum(RUTA_ROLES as [string, ...string[]]),
});

export async function crearUsuarioAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await exigirAdmin();
  const parsed = crearUsuarioSchema.safeParse({
    nombre: formData.get("nombre"),
    email: formData.get("email"),
    password: formData.get("password"),
    rol: formData.get("rol"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const email = parsed.data.email.toLowerCase();
  if (await prisma.usuario.findUnique({ where: { email } })) {
    return { error: "Ya existe un usuario con ese correo." };
  }
  await prisma.usuario.create({
    data: {
      nombre: parsed.data.nombre,
      email,
      passwordHash: await hashPassword(parsed.data.password),
      rol: parsed.data.rol,
      debeCambiarPassword: true,
      equipos: {
        create: formData.getAll("equipoIds").map((e) => ({ equipoId: String(e) })),
      },
    },
  });
  await registrarAuditoria(user, "usuario.crear", `${email} (${parsed.data.rol})`);
  revalidatePath("/admin/usuarios");
  return { ok: `Usuario ${email} creado.` };
}

export async function actualizarUsuarioAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await exigirAdmin();
  const id = String(formData.get("id") ?? "");
  const nombre = String(formData.get("nombre") ?? "").trim();
  const rolIn = String(formData.get("rol") ?? "");
  const rol = RUTA_ROLES.includes(rolIn) ? rolIn : "LIDER";
  const nueva = String(formData.get("password") ?? "");
  if (!nombre) return { error: "El nombre es obligatorio." };
  if (nueva && nueva.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres." };

  const u = await prisma.usuario.findUnique({ where: { id } });
  if (!u) return { error: "Usuario no encontrado." };
  if (esAdmin(u.rol) && !esAdmin(rol) && (await contarAdmins()) <= 1) {
    return { error: "No puedes quitar el rol al último administrador." };
  }

  const equipoIds = formData.getAll("equipoIds").map(String);
  await prisma.$transaction([
    prisma.usuario.update({
      where: { id },
      data: {
        nombre,
        rol,
        ...(nueva
          ? {
              passwordHash: await hashPassword(nueva),
              debeCambiarPassword: true,
              sesionVersion: { increment: 1 },
            }
          : {}),
      },
    }),
    prisma.usuarioEquipo.deleteMany({ where: { usuarioId: id } }),
    prisma.usuarioEquipo.createMany({
      data: equipoIds.map((equipoId) => ({ usuarioId: id, equipoId })),
    }),
  ]);
  await registrarAuditoria(
    admin,
    "usuario.editar",
    `${u.email}${nueva ? " (contraseña restablecida)" : ""}`
  );
  revalidatePath("/admin/usuarios");
  redirect("/admin/usuarios");
}

export async function eliminarUsuarioAction(formData: FormData) {
  const admin = await exigirAdmin();
  const id = String(formData.get("id") ?? "");
  if (id === admin.id) throw new Error("No puedes eliminar tu propia cuenta.");
  const u = await prisma.usuario.findUnique({ where: { id } });
  if (!u) throw new Error("Usuario no encontrado.");
  if (esAdmin(u.rol) && (await contarAdmins()) <= 1) {
    throw new Error("No puedes eliminar al último administrador.");
  }
  await prisma.usuario.delete({ where: { id } });
  await registrarAuditoria(admin, "usuario.eliminar", u.email);
  revalidatePath("/admin/usuarios");
}

export async function cambiarPasswordPropiaAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await exigirUsuario();
  const actual = String(formData.get("actual") ?? "");
  const nueva = String(formData.get("nueva") ?? "");
  const confirmar = String(formData.get("confirmar") ?? "");
  if (nueva.length < 8) return { error: "La nueva contraseña debe tener al menos 8 caracteres." };
  if (nueva !== confirmar) return { error: "La confirmación no coincide." };

  const u = await prisma.usuario.findUnique({ where: { id: user.id } });
  if (!u || !(await verifyPassword(actual, u.passwordHash))) {
    return { error: "La contraseña actual es incorrecta." };
  }
  if (await verifyPassword(nueva, u.passwordHash)) {
    return { error: "La nueva contraseña debe ser distinta de la actual." };
  }
  const actualizado = await prisma.usuario.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(nueva),
      debeCambiarPassword: false,
      sesionVersion: { increment: 1 },
    },
  });
  await createSession({
    sub: actualizado.id,
    rol: actualizado.rol as RolUsuario,
    nombre: actualizado.nombre,
    v: actualizado.sesionVersion,
  });
  await registrarAuditoria(user, "usuario.cambiar_password", u.email);
  redirect("/cuenta?ok=1");
}
