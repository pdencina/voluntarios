import { ImageResponse } from "next/og";
import { TarjetaOG } from "@/components/tarjeta-og";

export const alt = "Confirma tu disponibilidad";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Genérica a propósito: no muestra el nombre del voluntario en la vista previa del chat. */
export default function OpenGraphConfirmar() {
  return new ImageResponse(
    <TarjetaOG titulo="Confirma tu disponibilidad" subtitulo="Semana de servicio · Jueves 8 PM · Domingo 11 AM y 6 PM" />,
    size
  );
}
