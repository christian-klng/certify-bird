import { describe, expect, it } from "vitest";
import type { AppConfig } from "../config";
import { buildOrigin, trustedHostname } from "../origin";
import type { TenantResolution } from "../tenant";
import { generateToken, hashToken, normalizeEmail } from "./tokens";

describe("Tokens", () => {
  it("erzeugt lange, URL-taugliche und jedes Mal andere Tokens", () => {
    const a = generateToken();
    const b = generateToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a).not.toBe(b);
  });

  it("hasht deterministisch und gibt das Token nicht preis", () => {
    const token = generateToken();
    expect(hashToken(token)).toBe(hashToken(token));
    expect(hashToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(token)).not.toContain(token);
  });
});

describe("normalizeEmail", () => {
  it("vereinheitlicht die Schreibweise", () => {
    expect(normalizeEmail("  Anna@Beispiel.DE ")).toBe("anna@beispiel.de");
  });

  it("lehnt Unplausibles ab", () => {
    expect(normalizeEmail("anna")).toBeNull();
    expect(normalizeEmail("anna@beispiel")).toBeNull();
    expect(normalizeEmail("a b@beispiel.de")).toBeNull();
    expect(normalizeEmail(null)).toBeNull();
    expect(normalizeEmail(`${"a".repeat(250)}@b.de`)).toBeNull();
  });
});

const org = {
  id: "1",
  name: "Akademie Müller",
  slug: "mueller",
  customDomain: null,
  customDomainVerifiedAt: null,
};
const saas: AppConfig = { mode: "saas", baseDomain: "certifybird.com" };

describe("trustedHostname", () => {
  it("nimmt im Single-Modus nur die konfigurierte Domain", () => {
    const tenant: TenantResolution = {
      kind: "tenant",
      organization: org,
      canonicalHost: null,
      isCanonical: true,
    };
    expect(trustedHostname({ mode: "single", baseDomain: "z.akademie.de" }, tenant)).toBe(
      "z.akademie.de",
    );
    expect(trustedHostname({ mode: "single", baseDomain: null }, tenant)).toBeNull();
  });

  it("nimmt im SaaS-Modus die Hauptadresse des Mandanten oder der Plattform", () => {
    expect(
      trustedHostname(saas, {
        kind: "tenant",
        organization: org,
        canonicalHost: "mueller.certifybird.com",
        isCanonical: true,
      }),
    ).toBe("mueller.certifybird.com");
    expect(trustedHostname(saas, { kind: "platform" })).toBe("certifybird.com");
    expect(trustedHostname(saas, { kind: "not-found" })).toBeNull();
  });
});

describe("buildOrigin", () => {
  it("vertraut im Produktivbetrieb dem Host-Header nicht", () => {
    expect(buildOrigin("z.akademie.de", "boese.example:8080", true)).toBe(
      "https://z.akademie.de",
    );
    expect(buildOrigin(null, "boese.example", true)).toBeNull();
  });

  it("nutzt in der Entwicklung http und den Port der Anfrage", () => {
    expect(buildOrigin("mueller.localhost", "mueller.localhost:3000", false)).toBe(
      "http://mueller.localhost:3000",
    );
    expect(buildOrigin(null, "localhost:3000", false)).toBe("http://localhost:3000");
  });
});
