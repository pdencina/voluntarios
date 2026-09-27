import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NoEncontrado() {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center px-4 py-16">
      <div className="max-w-md text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent-200 text-brand-700">
          <SearchX className="h-7 w-7" />
        </span>
        <h1 className="mt-4 text-2xl font-bold text-brand-900">No encontramos esta página</h1>
        <p className="mt-2 text-sm text-slate-600">
          Puede que el link esté incompleto, que ya no exista, o que no tengas acceso con tu rol.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}
