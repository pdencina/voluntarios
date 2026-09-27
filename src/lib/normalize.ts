export function normalizarNombre(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita tildes
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}
