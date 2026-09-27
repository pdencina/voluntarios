import { ImageResponse } from "next/og";

const TAMANOS = [32, 192, 512];

export function generateImageMetadata() {
  return TAMANOS.map((t) => ({ id: String(t), size: { width: t, height: t }, contentType: "image/png" }));
}

/** Ícono de la app: corazón durazno sobre carbón (identidad ARM). */
export default async function Icon({ id }: { id: Promise<string> }) {
  const t = Number(await id) || 32;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#31302e",
          borderRadius: t >= 192 ? t * 0.22 : t * 0.18,
        }}
      >
        <svg width={t * 0.62} height={t * 0.62} viewBox="0 0 24 24">
          <path
            fill="#ebb6a7"
            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
          />
        </svg>
      </div>
    ),
    { width: t, height: t }
  );
}
