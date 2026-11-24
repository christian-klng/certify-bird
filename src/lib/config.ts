import { normalizeHost } from "./tenant-host";

export type AppMode = "single" | "saas";

export type AppConfig = {
  /** "single": genau ein Mandant auf einer Domain. "saas": viele Mandanten. */
  mode: AppMode;
  /**
   * Basis-Domain der Instanz ohne Protokoll und Port, z. B. "certifybird.com".
   * Im SaaS-Modus hängen die Mandanten als <kürzel>.<baseDomain> darunter.
   * Im Single-Modus wird sie nicht ausgewertet.
   */
  baseDomain: string | null;
};

export function readConfig(
  env: Record<string, string | undefined> = process.env,
): AppConfig {
  const rawMode = (env.APP_MODE ?? "single").trim().toLowerCase();
  if (rawMode !== "single" && rawMode !== "saas") {
    throw new Error(
      `APP_MODE muss "single" oder "saas" sein, ist aber "${env.APP_MODE}".`,
    );
  }

  const baseDomain = normalizeHost(env.APP_DOMAIN ?? null);
  if (rawMode === "saas" && !baseDomain) {
    throw new Error(
      'Im Modus "saas" muss APP_DOMAIN gesetzt sein, z. B. APP_DOMAIN=certifybird.com.',
    );
  }

  return { mode: rawMode, baseDomain };
}
