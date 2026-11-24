import { describe, expect, it } from "vitest";
import { readConfig, type AppConfig } from "./config";
import {
  resolveTenant,
  type TenantLookup,
  type TenantOrganization,
} from "./tenant";
import {
  classifyHost,
  isValidSlug,
  normalizeHost,
  slugify,
} from "./tenant-host";

const mueller: TenantOrganization = {
  id: "1",
  name: "Akademie Müller",
  slug: "akademie-mueller",
  customDomain: null,
  customDomainVerifiedAt: null,
};

const schmidt: TenantOrganization = {
  id: "2",
  name: "Schmidt Seminare",
  slug: "schmidt",
  customDomain: "zertifikate.schmidt-seminare.de",
  customDomainVerifiedAt: new Date("2026-01-01"),
};

const pending: TenantOrganization = {
  id: "3",
  name: "Noch Ungeprüft",
  slug: "ungeprueft",
  customDomain: "zertifikate.ungeprueft.de",
  customDomainVerifiedAt: null,
};

function lookupFor(
  organizations: TenantOrganization[],
  retired: Record<string, TenantOrganization> = {},
): TenantLookup {
  return {
    findFirst: async () => organizations[0] ?? null,
    findBySlug: async (slug) =>
      organizations.find((o) => o.slug === slug) ?? retired[slug] ?? null,
    findByVerifiedCustomDomain: async (domain) =>
      organizations.find(
        (o) => o.customDomain === domain && o.customDomainVerifiedAt,
      ) ?? null,
  };
}

const saas: AppConfig = { mode: "saas", baseDomain: "certifybird.com" };
const single: AppConfig = { mode: "single", baseDomain: null };
const all = lookupFor([mueller, schmidt, pending], { "alt-mueller": mueller });

describe("normalizeHost", () => {
  it("entfernt Port, Großschreibung und Schlusspunkt", () => {
    expect(normalizeHost("Akademie.CertifyBird.com:3000")).toBe(
      "akademie.certifybird.com",
    );
    expect(normalizeHost("certifybird.com.")).toBe("certifybird.com");
    expect(normalizeHost("[::1]:3000")).toBe("[::1]");
    expect(normalizeHost("")).toBeNull();
    expect(normalizeHost(null)).toBeNull();
  });
});

describe("slugify und isValidSlug", () => {
  it("schreibt Umlaute um", () => {
    expect(slugify("Akademie Müller")).toBe("akademie-mueller");
    expect(slugify("  Café & Straße GmbH ")).toBe("cafe-strasse-gmbh");
  });

  it("lehnt reservierte und ungültige Kürzel ab", () => {
    expect(isValidSlug("akademie-mueller")).toBe(true);
    expect(isValidSlug("www")).toBe(false);
    expect(isValidSlug("admin")).toBe(false);
    expect(isValidSlug("ab")).toBe(false);
    expect(isValidSlug("-abc")).toBe(false);
    expect(isValidSlug("xn--abc")).toBe(false);
    expect(isValidSlug("Akademie")).toBe(false);
  });
});

describe("classifyHost", () => {
  it("unterscheidet Plattform, Kürzel und fremde Domain", () => {
    expect(classifyHost("certifybird.com", "certifybird.com")).toEqual({
      kind: "platform",
    });
    expect(classifyHost("www.certifybird.com", "certifybird.com")).toEqual({
      kind: "platform",
    });
    expect(classifyHost("schmidt.certifybird.com", "certifybird.com")).toEqual({
      kind: "slug",
      slug: "schmidt",
    });
    expect(classifyHost("api.certifybird.com", "certifybird.com")).toEqual({
      kind: "unknown",
    });
    expect(classifyHost("a.b.certifybird.com", "certifybird.com")).toEqual({
      kind: "unknown",
    });
    expect(classifyHost("evilcertifybird.com", "certifybird.com")).toEqual({
      kind: "custom",
      domain: "evilcertifybird.com",
    });
  });
});

describe("resolveTenant im SaaS-Modus", () => {
  it("erkennt die Plattform", async () => {
    expect(await resolveTenant("certifybird.com", saas, all)).toEqual({
      kind: "platform",
    });
  });

  it("findet einen Mandanten über sein Kürzel", async () => {
    expect(
      await resolveTenant("akademie-mueller.certifybird.com:443", saas, all),
    ).toEqual({
      kind: "tenant",
      organization: mueller,
      canonicalHost: "akademie-mueller.certifybird.com",
      isCanonical: true,
    });
  });

  it("findet einen Mandanten über ein früheres Kürzel und verlangt Umleitung", async () => {
    expect(
      await resolveTenant("alt-mueller.certifybird.com", saas, all),
    ).toMatchObject({
      kind: "tenant",
      organization: mueller,
      canonicalHost: "akademie-mueller.certifybird.com",
      isCanonical: false,
    });
  });

  it("behandelt die geprüfte eigene Domain als Hauptadresse", async () => {
    expect(
      await resolveTenant("zertifikate.schmidt-seminare.de", saas, all),
    ).toMatchObject({ organization: schmidt, isCanonical: true });
    expect(
      await resolveTenant("schmidt.certifybird.com", saas, all),
    ).toMatchObject({
      organization: schmidt,
      canonicalHost: "zertifikate.schmidt-seminare.de",
      isCanonical: false,
    });
  });

  it("ignoriert eine ungeprüfte eigene Domain", async () => {
    expect(await resolveTenant("zertifikate.ungeprueft.de", saas, all)).toEqual({
      kind: "not-found",
    });
    expect(
      await resolveTenant("ungeprueft.certifybird.com", saas, all),
    ).toMatchObject({
      canonicalHost: "ungeprueft.certifybird.com",
      isCanonical: true,
    });
  });

  it("meldet unbekannte Hosts als nicht gefunden", async () => {
    expect(await resolveTenant("gibtsnicht.certifybird.com", saas, all)).toEqual(
      { kind: "not-found" },
    );
    expect(await resolveTenant("fremd.example.org", saas, all)).toEqual({
      kind: "not-found",
    });
    expect(await resolveTenant(null, saas, all)).toEqual({ kind: "not-found" });
  });
});

describe("resolveTenant im Single-Modus", () => {
  it("liefert unabhängig vom Host den einen Mandanten", async () => {
    expect(
      await resolveTenant("irgendwas.example.org", single, lookupFor([mueller])),
    ).toEqual({
      kind: "tenant",
      organization: mueller,
      canonicalHost: null,
      isCanonical: true,
    });
  });

  it("verlangt die Einrichtung, solange kein Mandant existiert", async () => {
    expect(await resolveTenant("localhost", single, lookupFor([]))).toEqual({
      kind: "setup",
    });
  });
});

describe("readConfig", () => {
  it("nimmt single als Standard", () => {
    expect(readConfig({})).toEqual({ mode: "single", baseDomain: null });
  });

  it("verlangt im SaaS-Modus eine Basis-Domain", () => {
    expect(() => readConfig({ APP_MODE: "saas" })).toThrow(/APP_DOMAIN/);
    expect(
      readConfig({ APP_MODE: "saas", APP_DOMAIN: "CertifyBird.com:443" }),
    ).toEqual({ mode: "saas", baseDomain: "certifybird.com" });
  });

  it("lehnt unbekannte Modi ab", () => {
    expect(() => readConfig({ APP_MODE: "multi" })).toThrow(/APP_MODE/);
  });
});
