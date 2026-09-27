import { ImageResponse } from "next/og";
import { TarjetaOG } from "@/components/tarjeta-og";

export const alt = "Voluntarios CPA";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraph() {
  return new ImageResponse(
    <TarjetaOG titulo="Servir juntos, organizados" subtitulo="Equipos, convocatorias y distribución de voluntarios" />,
    size
  );
}
