import type { MetadataRoute } from "next";

/** Permite instalar el sistema en la pantalla de inicio del celular como una app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Voluntarios CPA",
    short_name: "Voluntarios",
    description: "Administración de equipos de voluntarios del Campus Puente Alto",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fff9f4",
    theme_color: "#31302e",
    lang: "es-CL",
    icons: [
      { src: "/icon/192", sizes: "192x192", type: "image/png" },
      { src: "/icon/512", sizes: "512x512", type: "image/png" },
      { src: "/icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
