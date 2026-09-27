import { KeyRound } from "lucide-react";
import { logoutAction } from "@/lib/actions";
import CambiarPasswordForm from "./cuenta/CambiarPasswordForm";

export default function CambioObligatorio({ nombre }: { nombre: string }) {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-gradient-to-br from-brand-600 via-brand-700 to-brand-800 px-4 py-10">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center gap-3 bg-accent-200 px-6 py-5 text-brand-900">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/70">
            <KeyRound className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-lg font-bold">Hola, {nombre.split(" ")[0]}</h1>
            <p className="text-sm">Antes de continuar, crea tu propia contraseña.</p>
          </div>
        </div>
        <div className="space-y-4 p-6">
          <p className="text-sm text-slate-600">
            La contraseña que tienes la asignó un administrador. Cámbiala por una que solo tú conozcas.
            En “Contraseña actual” escribe la que te entregaron.
          </p>
          <CambiarPasswordForm />
          <form action={logoutAction}>
            <button className="text-sm text-slate-500 hover:underline">Cerrar sesión</button>
          </form>
        </div>
      </div>
    </div>
  );
}
