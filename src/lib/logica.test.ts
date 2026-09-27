// Todos los nombres y teléfonos de estas pruebas son inventados.
import { describe, expect, it } from "vitest";
import {
  calcularMembresias,
  distanciaLevenshtein,
  enlaceWhatsApp,
  inferirGenero,
  lunesDeSemana,
  nombresSimilares,
  proximoLunes,
  telefonoWhatsApp,
} from "./logica";
import { normalizarNombre } from "./normalize";

describe("normalizarNombre", () => {
  it("quita tildes, espacios extra y mayúsculas", () => {
    expect(normalizarNombre("  Íñigo  Ávila ")).toBe("inigo avila");
  });
});

describe("nombresSimilares", () => {
  it("detecta variaciones del mismo nombre", () => {
    expect(nombresSimilares("Bernarda Muñoz", "Bernardita Muñoz")).toBe(true);
    expect(nombresSimilares("Marta Rojas", "Marta Rojas / Emi")).toBe(true);
  });
  it("no mezcla personas distintas", () => {
    expect(nombresSimilares("Juan Pérez", "Pedro Soto")).toBe(false);
    expect(nombresSimilares("Paula Vera", "Paula Alarcón")).toBe(false);
    expect(nombresSimilares("Paula Peña", "Paula Vera")).toBe(false);
    expect(nombresSimilares("Alejandra Porras", "Alexandra Corral")).toBe(false);
  });
  it("un solo nombre corto no cuenta como contenido", () => {
    expect(nombresSimilares("Tomás", "Tomás Pérez")).toBe(false);
  });
});

describe("distanciaLevenshtein", () => {
  it("calcula ediciones", () => {
    expect(distanciaLevenshtein("kitten", "sitting")).toBe(3);
    expect(distanciaLevenshtein("", "abc")).toBe(3);
  });
});

describe("lunesDeSemana", () => {
  it("devuelve el lunes de cualquier día de la semana", () => {
    expect(lunesDeSemana("2026-09-28")?.toISOString()).toBe("2026-09-28T00:00:00.000Z");
    expect(lunesDeSemana("2026-10-04")?.toISOString()).toBe("2026-09-28T00:00:00.000Z"); // domingo
    expect(lunesDeSemana("2026-09-30")?.toISOString()).toBe("2026-09-28T00:00:00.000Z");
  });
  it("rechaza formatos inválidos", () => {
    expect(lunesDeSemana("28/09/2026")).toBeNull();
  });
});

describe("proximoLunes", () => {
  it("desde miércoles → lunes siguiente; desde lunes → +7", () => {
    expect(proximoLunes(new Date(2026, 8, 23)).toISOString()).toBe("2026-09-28T00:00:00.000Z");
    expect(proximoLunes(new Date(2026, 8, 28)).toISOString()).toBe("2026-10-05T00:00:00.000Z");
  });
});

describe("calcularMembresias", () => {
  it("admin puede cambiar todo", () => {
    expect(calcularMembresias(["a", "b"], ["b", "c"], "todos")).toEqual({
      agregar: ["c"],
      quitar: ["a"],
    });
  });
  it("líder no toca equipos ajenos", () => {
    const r = calcularMembresias(["a", "x"], ["b"], ["a", "b"]);
    expect(r.agregar).toEqual(["b"]);
    expect(r.quitar).toEqual(["a"]);
    expect(r.quitar).not.toContain("x");
  });
  it("líder no puede agregar equipos no permitidos", () => {
    expect(calcularMembresias([], ["z"], ["a"]).agregar).toEqual([]);
  });
});

describe("telefonoWhatsApp", () => {
  it("normaliza celulares chilenos", () => {
    expect(telefonoWhatsApp("9 1234 5678")).toBe("56912345678");
    expect(telefonoWhatsApp("+56 9 8765 4321")).toBe("56987654321");
    expect(telefonoWhatsApp("56987654321")).toBe("56987654321");
    expect(telefonoWhatsApp("12345678")).toBe("56912345678");
  });
  it("rechaza vacíos o números inválidos", () => {
    expect(telefonoWhatsApp("")).toBeNull();
    expect(telefonoWhatsApp(null)).toBeNull();
    expect(telefonoWhatsApp("123")).toBeNull();
  });
  it("arma el enlace con el mensaje codificado", () => {
    expect(enlaceWhatsApp("912345678", "Hola & bienvenido")).toBe(
      "https://wa.me/56912345678?text=Hola%20%26%20bienvenido"
    );
  });
});

describe("inferirGenero", () => {
  it("sugiere por el primer nombre", () => {
    expect(inferirGenero("María José Lagos")).toBe("F");
    expect(inferirGenero("Nicolás Fuentes")).toBe("M");
    expect(inferirGenero("Richard Mora")).toBe("M");
    expect(inferirGenero("Daisy Leiva")).toBe("F");
    expect(inferirGenero("Luca Pérez")).toBe("M");
    expect(inferirGenero("Zaira Pinto")).toBe("F");
  });
  it("no adivina cuando es ambiguo", () => {
    expect(inferirGenero("Su")).toBeNull();
    expect(inferirGenero("Alex")).toBe("M");
    expect(inferirGenero("Cami")).toBeNull();
  });
});
