import { HeartHandshake } from "lucide-react";
import LoginForm from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="grid min-h-full flex-1 lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-brand-800 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/10" />
        <div className="absolute -bottom-24 -left-10 h-72 w-72 rounded-full bg-accent-300/25" />
        <div className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-accent-300 to-accent-400 text-brand-900">
            <HeartHandshake className="h-6 w-6" />
          </span>
          <span className="text-xl font-bold">Voluntarios CPA</span>
        </div>
        <div className="relative max-w-md">
          <h2 className="text-3xl font-bold leading-tight">Servir juntos es mejor cuando estamos organizados.</h2>
          <p className="mt-4 text-brand-100">
            Equipos, convocatorias semanales, nuevos voluntarios y personas nuevas, todo en un solo lugar.
          </p>
        </div>
        <p className="relative text-sm text-brand-200">Administración de equipos de voluntarios</p>
      </div>

      <div className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center gap-2 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 text-white">
              <HeartHandshake className="h-5 w-5" />
            </span>
            <span className="text-lg font-bold text-brand-900">Voluntarios CPA</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-brand-900">Bienvenido/a</h1>
          <p className="mb-6 mt-1 text-sm text-slate-500">
            Ingresa con tu cuenta de administrador, pastor o líder de equipo.
          </p>
          <LoginForm next={next} />
        </div>
      </div>
    </div>
  );
}
