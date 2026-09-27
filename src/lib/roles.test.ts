import { describe, expect, it } from "vitest";
import {
  ROLES,
  esAdmin,
  etiquetaRol,
  puedeConvocar,
  puedePostular,
  veTodo,
} from "./constants";

describe("permisos por rol", () => {
  it("Administrador y Pastor de campus tienen poder de administrador", () => {
    for (const rol of ["ADMIN", "PASTOR_CAMPUS"]) {
      expect(esAdmin(rol) && veTodo(rol) && puedeConvocar(rol) && puedePostular(rol)).toBe(true);
    }
  });
  it("Administrador de campus: solo sus equipos, convoca y postula", () => {
    expect(esAdmin("ADMIN_CAMPUS")).toBe(false);
    expect(veTodo("ADMIN_CAMPUS")).toBe(false);
    expect(puedeConvocar("ADMIN_CAMPUS")).toBe(true);
    expect(puedePostular("ADMIN_CAMPUS")).toBe(true);
  });
  it("Líder: solo sus equipos, sin convocar ni postular", () => {
    expect(esAdmin("LIDER") || veTodo("LIDER")).toBe(false);
    expect(puedeConvocar("LIDER")).toBe(false);
    expect(puedePostular("LIDER")).toBe(false);
  });
  it("hay cuatro roles con etiqueta", () => {
    expect(ROLES).toHaveLength(4);
    expect(etiquetaRol("PASTOR_CAMPUS")).toBe("Pastor de campus");
  });
});
