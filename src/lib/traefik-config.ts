/**
 * Erzeugt die dynamische Konfiguration, die Traefik über seinen HTTP-Provider
 * abholt: ein Router je eigener Domain. Nur mit ausdrücklichem Hostnamen
 * (Host(...)) holt Traefik ein Zertifikat; eine Regel für beliebige Hosts
 * genügt dafür nicht.
 */
export function traefikConfig(input: {
  domains: string[];
  /** Adresse der App aus Sicht des Proxys, z. B. http://app:3000 */
  serviceUrl: string;
  /** Name des Zertifikats-Resolvers mit HTTP-Challenge. */
  certResolver: string;
}) {
  if (input.domains.length === 0) return {};
  const routers: Record<string, unknown> = {};
  for (const domain of [...input.domains].sort()) {
    const name = `certifybird-${domain.replace(/[^a-z0-9]/g, "-")}`;
    routers[name] = {
      rule: `Host(\`${domain}\`)`,
      entryPoints: ["https"],
      service: "certifybird-custom",
      tls: { certResolver: input.certResolver },
    };
    routers[`${name}-http`] = {
      rule: `Host(\`${domain}\`)`,
      entryPoints: ["http"],
      service: "certifybird-custom",
      middlewares: ["certifybird-to-https"],
    };
  }
  return {
    http: {
      routers,
      middlewares: { "certifybird-to-https": { redirectScheme: { scheme: "https" } } },
      services: {
        "certifybird-custom": { loadBalancer: { servers: [{ url: input.serviceUrl }] } },
      },
    },
  };
}
