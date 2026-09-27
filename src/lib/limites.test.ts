import { describe, expect, it } from "vitest";
import { ipDeCabeceras, motivoBloqueo } from "./limites";

describe("motivoBloqueo", () => {
  it("permite intentos normales", () => {
    expect(motivoBloqueo({ cuentaEIp: 4, cuenta: 4, ip: 4 })).toBeNull();
  });
  it("bloquea 5 fallos de la misma cuenta desde la misma conexión", () => {
    expect(motivoBloqueo({ cuentaEIp: 5, cuenta: 5, ip: 5 })).toMatch(/Demasiados intentos/);
  });
  it("un atacante desde otra conexión no bloquea al dueño de la cuenta", () => {
    // 5 fallos del atacante; el líder real, desde su conexión, tiene 0.
    expect(motivoBloqueo({ cuentaEIp: 0, cuenta: 5, ip: 0 })).toBeNull();
  });
  it("frena ataques distribuidos a una cuenta y rociado desde una IP", () => {
    expect(motivoBloqueo({ cuentaEIp: 1, cuenta: 30, ip: 1 })).toMatch(/cuenta/);
    expect(motivoBloqueo({ cuentaEIp: 1, cuenta: 1, ip: 40 })).toMatch(/conexión/);
  });
});

describe("ipDeCabeceras", () => {
  it("toma la primera IP de x-forwarded-for", () => {
    expect(ipDeCabeceras("200.1.2.3, 10.0.0.1", null)).toBe("200.1.2.3");
    expect(ipDeCabeceras(null, " 190.5.5.5 ")).toBe("190.5.5.5");
    expect(ipDeCabeceras(null, null)).toBe("desconocida");
  });
});
