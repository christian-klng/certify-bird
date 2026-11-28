import { describe, expect, it } from "vitest";
import { traefikConfig, traefikTargetFromEnv } from "./traefik-config";

type Config = {
  http: {
    routers: Record<string, Record<string, unknown>>;
    services?: unknown;
  };
};

describe("traefikConfig", () => {
  it("ist leer, solange es keine eigenen Domains gibt", () => {
    expect(
      traefikConfig({ domains: [], target: { url: "http://app:3000" }, certResolver: "le" }),
    ).toEqual({});
  });

  it("legt je Domain einen Router mit festem Hostnamen und Zertifikat an", () => {
    const config = traefikConfig({
      domains: ["zertifikate.akademie.de"],
      target: { url: "http://app:3000" },
      certResolver: "letsencrypt-http",
    }) as Config;
    expect(config.http.routers["certifybird-zertifikate-akademie-de"]).toEqual({
      rule: "Host(`zertifikate.akademie.de`)",
      entryPoints: ["https"],
      service: "certifybird-custom",
      tls: { certResolver: "letsencrypt-http" },
    });
    expect(config.http.routers["certifybird-zertifikate-akademie-de-http"].middlewares).toEqual([
      "certifybird-to-https",
    ]);
    expect(config.http.services).toEqual({
      "certifybird-custom": { loadBalancer: { servers: [{ url: "http://app:3000" }] } },
    });
  });

  it("verweist auf einen bestehenden Traefik-Dienst, ohne einen eigenen anzulegen", () => {
    const config = traefikConfig({
      domains: ["zertifikate.akademie.de"],
      target: { name: "certifybird@docker" },
      certResolver: "letsencrypt-http",
    }) as Config;
    expect(config.http.routers["certifybird-zertifikate-akademie-de"].service).toBe(
      "certifybird@docker",
    );
    expect(config.http.routers["certifybird-zertifikate-akademie-de-http"].service).toBe(
      "certifybird@docker",
    );
    expect(config.http.services).toBeUndefined();
  });
});

describe("traefikTargetFromEnv", () => {
  it("ist aus ohne Angaben", () => {
    expect(traefikTargetFromEnv({})).toBeNull();
    expect(traefikTargetFromEnv({ TRAEFIK_SERVICE: " ", TRAEFIK_SERVICE_URL: "" })).toBeNull();
  });

  it("bevorzugt den Dienstnamen vor der Adresse", () => {
    expect(
      traefikTargetFromEnv({
        TRAEFIK_SERVICE: "certifybird@docker",
        TRAEFIK_SERVICE_URL: "http://app:3000",
      }),
    ).toEqual({ name: "certifybird@docker" });
    expect(traefikTargetFromEnv({ TRAEFIK_SERVICE_URL: "http://app:3000" })).toEqual({
      url: "http://app:3000",
    });
  });
});
