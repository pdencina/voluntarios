import "server-only";
import { headers } from "next/headers";

/** Origen público del sitio (https://dominio) para armar links que se comparten. */
export async function origenSitio(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
