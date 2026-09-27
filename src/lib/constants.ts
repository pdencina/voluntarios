export const TIPO_EQUIPO = {
  MINISTERIO: "MINISTERIO",
  ROTATIVO: "ROTATIVO",
} as const;
export type TipoEquipo = (typeof TIPO_EQUIPO)[keyof typeof TIPO_EQUIPO];

export const ROL_USUARIO = {
  ADMIN: "ADMIN",
  PASTOR_CAMPUS: "PASTOR_CAMPUS",
  ADMIN_CAMPUS: "ADMIN_CAMPUS",
  LIDER: "LIDER",
} as const;
export type RolUsuario = (typeof ROL_USUARIO)[keyof typeof ROL_USUARIO];

export const ROLES = [
  { value: "ADMIN", label: "Administrador", corto: "Admin", detalle: "ve y gestiona todo" },
  { value: "PASTOR_CAMPUS", label: "Pastor de campus", corto: "Pastor", detalle: "acceso total y panel pastoral" },
  { value: "ADMIN_CAMPUS", label: "Administrador de campus", corto: "Adm. campus", detalle: "gestiona sus equipos, convocatorias e ingreso de voluntarios" },
  { value: "LIDER", label: "Líder de equipo", corto: "Líder", detalle: "gestiona sus equipos" },
] as const;

export const RUTA_ROLES: string[] = ROLES.map((r) => r.value);

export function etiquetaRol(rol: string, corta = false) {
  const r = ROLES.find((x) => x.value === rol);
  return r ? (corta ? r.corto : r.label) : rol;
}
/** Ve todos los equipos y voluntarios. */
export function veTodo(rol: string) {
  return rol === "ADMIN" || rol === "PASTOR_CAMPUS";
}
/** Poder de administrador: Administrador y Pastor de campus. */
export function esAdmin(rol: string) {
  return rol === "ADMIN" || rol === "PASTOR_CAMPUS";
}
/** Puede crear/editar voluntarios. */
export function puedeEditar(rol: string) {
  return rol.length > 0; // todos los roles con sesión
}
/** Puede abrir, sincronizar y cerrar convocatorias. */
export function puedeConvocar(rol: string) {
  return esAdmin(rol) || rol === "ADMIN_CAMPUS";
}
/** Puede subir postulaciones de personas que quieren sumarse. */
export function puedePostular(rol: string) {
  return esAdmin(rol) || rol === "ADMIN_CAMPUS";
}

export const TIEMPO_IGLESIA = [
  { value: "MENOS_6M", label: "Menos de 6 meses" },
  { value: "DE_6M_A_1A", label: "6 meses a 1 año" },
  { value: "DE_1_A_3A", label: "1 a 3 años" },
  { value: "MAS_3A", label: "Más de 3 años" },
] as const;

export const ESTADOS_POSTULACION = {
  PENDIENTE: { label: "Pendiente", color: "bg-slate-100 text-slate-700" },
  ACEPTADA: { label: "Aceptada", color: "bg-emerald-100 text-emerald-800" },
  AUN_NO: { label: "Aún no", color: "bg-amber-100 text-amber-800" },
  INTEGRADA: { label: "Integrada a un equipo", color: "bg-sky-100 text-sky-800" },
} as const;

/** Valores de la cabecera de la planilla cuando la semana no tiene los suyos ni hay semanas anteriores. */
export const CABECERA_DEFECTO = {
  pastores: "Pablo & Naty",
  administradoresCampus: "Min. Rodrigo & Kathy",
  lideresVoluntarios: "Eduardo & Nicole",
};

export const FRANJAS = [
  { key: "disponibleJueves", label: "Jueves 8 PM" },
  { key: "disponibleDomingoAM", label: "Domingo 11 AM" },
  { key: "disponibleDomingoPM", label: "Domingo 6 PM" },
] as const;
export type FranjaKey = (typeof FRANJAS)[number]["key"];
