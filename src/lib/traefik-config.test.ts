import { describe, expect, it } from "vitest";
import { traefikConfig } from "./traefik-config";

describe("traefikConfig", () => {
  it("ist leer, solange es keine eigenen Domains gibt", () => {
    expect(traefikConfig({ domains: [], serviceUrl: "http://app:3000", certResolver: "le" })).toEqual({});
  });

  it("legt je Domain einen Router mit festem Hostnamen und Zertifikat an", () => {
    const config = traefikConfig({
      domains: ["zertifikate.akademie.de"],
      serviceUrl: "http://app:3000",
      certResolver: "letsencrypt-http",
    }) as { http: { routers: Record<string, Record<string, unknown>>; services: unknown } };
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
});
