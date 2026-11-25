import { describe, expect, it } from "vitest";
import {
  checkCustomDomain,
  cnameTarget,
  domainToken,
  normalizeCustomDomain,
  type DomainCheckDeps,
} from "./custom-domain";

const base = "certifybird.com";

describe("normalizeCustomDomain", () => {
  it("räumt übliche Eingaben auf", () => {
    expect(normalizeCustomDomain(" https://Zertifikate.Akademie.de/pfad ", base)).toBe(
      "zertifikate.akademie.de",
    );
    expect(normalizeCustomDomain("zertifikate.akademie.de:443", base)).toBe("zertifikate.akademie.de");
  });

  it("lehnt Hauptdomains, Plattform-Adressen, IPs und Unsinn ab", () => {
    for (const bad of [
      "akademie.de",
      "certifybird.com",
      "kunde.certifybird.com",
      "a.b.certifybird.com",
      "192.168.0.1",
      "10.0.0.1.2",
      "app.dienst.localhost",
      "zertifikate.akademie.internal",
      "zerti fikate.akademie.de",
      "-a.akademie.de",
      "a_b.akademie.de",
      "",
      null,
    ]) {
      expect(normalizeCustomDomain(bad, base)).toBeNull();
    }
  });
});

describe("checkCustomDomain", () => {
  const input = {
    domain: "zertifikate.akademie.de",
    target: cnameTarget("akademie", base),
    token: domainToken("org-1"),
  };
  const deps = (cname: string[], token: string | null): DomainCheckDeps => ({
    resolveCname: async () => cname,
    probe: async () => token,
  });

  it("gelingt, wenn CNAME und Antwort der Instanz stimmen", async () => {
    expect(await checkCustomDomain(input, deps(["Akademie.certifybird.com."], input.token))).toEqual({
      ok: true,
    });
  });

  it("scheitert am DNS, wenn der CNAME fehlt oder woandershin zeigt", async () => {
    expect(await checkCustomDomain(input, deps([], input.token))).toEqual({
      ok: false,
      step: "dns",
      found: [],
    });
    // Zeigt auf einen anderen Mandanten: beweist nichts für diesen.
    expect(await checkCustomDomain(input, deps(["andere.certifybird.com"], input.token))).toMatchObject({
      step: "dns",
      found: ["andere.certifybird.com"],
    });
  });

  it("fragt die Instanz gar nicht erst, solange das DNS nicht stimmt", async () => {
    let probed = false;
    await checkCustomDomain(input, {
      resolveCname: async () => [],
      probe: async () => {
        probed = true;
        return input.token;
      },
    });
    expect(probed).toBe(false);
  });

  it("scheitert an HTTPS bei falscher oder fehlender Antwort und bei Fehlern", async () => {
    const cname = ["akademie.certifybird.com"];
    expect(await checkCustomDomain(input, deps(cname, null))).toEqual({ ok: false, step: "https" });
    expect(await checkCustomDomain(input, deps(cname, domainToken("org-2")))).toEqual({
      ok: false,
      step: "https",
    });
    expect(
      await checkCustomDomain(input, {
        resolveCname: async () => cname,
        probe: async () => {
          throw new Error("Zertifikat ungültig");
        },
      }),
    ).toEqual({ ok: false, step: "https" });
  });

  it("behandelt DNS-Fehler wie einen fehlenden Eintrag", async () => {
    expect(
      await checkCustomDomain(input, {
        resolveCname: async () => {
          throw new Error("ENOTFOUND");
        },
        probe: async () => input.token,
      }),
    ).toMatchObject({ step: "dns" });
  });
});
