import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { veTodo, type RolUsuario } from "@/lib/constants";

const COOKIE_NAME = "cpa_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 días

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("Falta SESSION_SECRET en el archivo .env");
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

type SessionPayload = {
  sub: string;
  rol: RolUsuario;
  nombre: string;
  /** Versión de sesión del usuario al iniciar sesión; si cambia, la sesión deja de valer. */
  v: number;
};

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT({ rol: payload.rol, nombre: payload.nombre, v: payload.v })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecretKey());

  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function readSessionToken(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (!payload.sub || !payload.rol || !payload.nombre) return null;
    return {
      sub: payload.sub,
      rol: payload.rol as RolUsuario,
      nombre: payload.nombre as string,
      v: typeof payload.v === "number" ? payload.v : 0,
    };
  } catch {
    return null;
  }
}

export type CurrentUser = {
  id: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
  equipoIds: string[];
  debeCambiarPassword: boolean;
};

/** Usuario de la sesión actual. Memorizado por solicitud: layout y página comparten una sola consulta. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await readSessionToken();
  if (!session) return null;

  const usuario = await prisma.usuario.findUnique({
    where: { id: session.sub },
    include: { equipos: { select: { equipoId: true } } },
  });
  if (!usuario) return null;
  if (usuario.sesionVersion !== session.v) return null;
  if (usuario.expiraEn && usuario.expiraEn.getTime() <= Date.now()) return null;

  return {
    id: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
    rol: usuario.rol as RolUsuario,
    equipoIds: usuario.equipos.map((e) => e.equipoId),
    debeCambiarPassword: usuario.debeCambiarPassword,
  };
});

export function puedeVerEquipo(user: CurrentUser, equipoId: string) {
  return veTodo(user.rol) || user.equipoIds.includes(equipoId);
}
