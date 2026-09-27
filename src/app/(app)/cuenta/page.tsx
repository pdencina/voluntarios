import { getCurrentUser } from "@/lib/auth";
import CambiarPasswordForm from "./CambiarPasswordForm";

export default async function CuentaPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  const { ok } = await searchParams;
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <div className="max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-brand-900">Mi cuenta</h1>
        <p className="text-sm text-slate-500">{user.nombre} · {user.email}</p>
      </div>
      {ok === "1" && (
        <p className="rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Contraseña actualizada.
        </p>
      )}
      <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm p-5">
        <h2 className="mb-3 font-semibold text-slate-900">Cambiar contraseña</h2>
        <CambiarPasswordForm />
      </div>
    </div>
  );
}
