/**
 * Wohin Traefik die Anfragen für eigene Domains leitet:
 * - `name`: ein Dienst, den Traefik schon kennt, etwa aus den Docker-Labels
 *   der App (`certifybird@docker`). Traefik führt ihn bei jedem Deployment
 *   selbst nach; dafür braucht es keinen festen Containernamen.
 * - `url`: eine feste Adresse der App aus Sicht des Proxys, z. B. http://app:3000.
 */
export type TraefikTarget = { name: string } | { url: string };

/**
 * Erzeugt die dynamische Konfiguration, die Traefik über seinen HTTP-Provider
 * abholt: ein Router je eigener Domain. Nur mit ausdrücklichem Hostnamen
 * (Host(...)) holt Traefik ein Zertifikat; eine Regel für beliebige Hosts
 * genügt dafür nicht.
 */
export function traefikConfig(input: {
  domains: string[];
  target: TraefikTarget;
  /** Name des Zertifikats-Resolvers mit HTTP-Challenge. */
  certResolver: string;
}) {
  if (input.domains.length === 0) return {};
  const service = "name" in input.target ? input.target.name : "certifybird-custom";
  const routers: Record<string, unknown> = {};
  for (const domain of [...input.domains].sort()) {
    const name = `certifybird-${domain.replace(/[^a-z0-9]/g, "-")}`;
    routers[name] = {
      rule: `Host(\`${domain}\`)`,
      entryPoints: ["https"],
      service,
      tls: { certResolver: input.certResolver },
    };
    routers[`${name}-http`] = {
      rule: `Host(\`${domain}\`)`,
      entryPoints: ["http"],
      service,
      middlewares: ["certifybird-to-https"],
    };
  }
  return {
    http: {
      routers,
      middlewares: { "certifybird-to-https": { redirectScheme: { scheme: "https" } } },
      ...("url" in input.target && {
        services: {
          "certifybird-custom": { loadBalancer: { servers: [{ url: input.target.url }] } },
        },
      }),
    },
  };
}

/**
 * Liest das Ziel aus der Umgebung: TRAEFIK_SERVICE (Name eines bestehenden
 * Traefik-Dienstes) hat Vorrang vor TRAEFIK_SERVICE_URL. Ohne beides ist die
 * Traefik-Anbindung aus.
 */
export function traefikTargetFromEnv(env: Record<string, string | undefined>): TraefikTarget | null {
  const name = env.TRAEFIK_SERVICE?.trim();
  if (name) return { name };
  const url = env.TRAEFIK_SERVICE_URL?.trim();
  if (url) return { url };
  return null;
}
