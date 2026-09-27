/** Tarjeta de vista previa (1200×630) que aparece al compartir links por WhatsApp. */
export function TarjetaOG({ titulo, subtitulo }: { titulo: string; subtitulo: string }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: "linear-gradient(135deg, #31302e 0%, #1d1d1b 100%)",
        color: "#fff9f4",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 18,
            background: "#ebb6a7",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width={44} height={44} viewBox="0 0 24 24">
            <path
              fill="#31302e"
              d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
            />
          </svg>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 34, fontWeight: 700 }}>Voluntarios CPA</span>
          <span style={{ fontSize: 24, color: "#cbbfb4" }}>Campus Puente Alto</span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <span style={{ fontSize: 68, fontWeight: 800, lineHeight: 1.1 }}>{titulo}</span>
        <span style={{ fontSize: 32, color: "#ebb6a7" }}>{subtitulo}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", fontSize: 30, color: "#a39a91" }}>
        <span style={{ fontWeight: 300 }}>arm</span>
        <span style={{ fontWeight: 800 }}>global</span>
      </div>
    </div>
  );
}
