export const LIMITES_LOGIN = {
  ventanaMs: 15 * 60 * 1000,
  /** Mismo correo desde la misma conexión: el caso normal de clave olvidada. */
  porCuentaEIp: 5,
  /** Mismo correo desde muchas conexiones: ataque distribuido a una cuenta. */
  porCuenta: 30,
  /** Misma conexión probando muchos correos. */
  porIp: 40,
} as const;

export type ConteoIntentos = { cuentaEIp: number; cuenta: number; ip: number };

/**
 * Decide si se bloquea un intento de inicio de sesión. Bloquear solo por correo permitiría que
 * cualquiera deje sin acceso a un líder a propósito; por eso el límite estricto es por correo + IP.
 */
export function motivoBloqueo(c: ConteoIntentos): string | null {
  const espera = "Espera 15 minutos e inténtalo de nuevo.";
  if (c.cuentaEIp >= LIMITES_LOGIN.porCuentaEIp) return `Demasiados intentos fallidos. ${espera}`;
  if (c.ip >= LIMITES_LOGIN.porIp) return `Demasiados intentos desde esta conexión. ${espera}`;
  if (c.cuenta >= LIMITES_LOGIN.porCuenta) return `Esta cuenta tiene demasiados intentos fallidos. ${espera}`;
  return null;
}

/** Primera IP de x-forwarded-for (la del cliente en Vercel). */
export function ipDeCabeceras(forwardedFor: string | null, realIp: string | null): string {
  const primera = forwardedFor?.split(",")[0]?.trim();
  return primera || realIp?.trim() || "desconocida";
}
