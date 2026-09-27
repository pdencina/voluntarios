export default function Cargando() {
  const bloque = "animate-pulse rounded-xl bg-slate-200/70";
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Cargando">
      <div className="space-y-2">
        <div className={`${bloque} h-8 w-64`} />
        <div className={`${bloque} h-4 w-96 max-w-full`} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`${bloque} h-24`} />
        ))}
      </div>
      <div className={`${bloque} h-72`} />
    </div>
  );
}
